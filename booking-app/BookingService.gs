function bookConsultation(input) {
  let lock, reservationStarted=false;
  try {
    const c=config_(), p=validate_(input);
    const id='b'+hash_(p.requestId), key='BOOKING_'+id;
    const fingerprint=hash_(JSON.stringify([p.name,p.email,p.start,p.note]));
    lock=LockService.getScriptLock();
    if(!lock.tryLock(20000)) throw new Error('LOCK');
    const props=PropertiesService.getScriptProperties();
    let r=JSON.parse(props.getProperty(key) || 'null');
    reservationStarted=!!r;
    if(r && r.fingerprint!==fingerprint) throw new Error('INVALID');
    let event;
    if(r) {
      event=findEvent_(c,id);
      if(event && event.status==='cancelled') throw new Error('CANCELLED');
      if(event && (!event.extendedProperties || event.extendedProperties.private.bookingFingerprint!==fingerprint)) throw new Error('UNCERTAIN');
      if(!event && r.status==='confirmed') throw new Error('UNCERTAIN');
    }
    if(!event) {
      const start=Date.parse(p.start);
      if(!candidates_(c,Date.now()).includes(start)) throw new Error('TAKEN');
      if(overlaps_(start,busy_(c,[start]).concat(ledger_(key)),c)) throw new Error('TAKEN');
      if(!r) {
        r={start,end:start+1800000,fingerprint,consentAt:new Date().toISOString(),status:'pending',
          customerMail:'notSent',ownerMail:'notSent',log:'notSaved'};
        reservationStarted=true;
        props.setProperty(key,JSON.stringify(r)); // Durable reservation BEFORE Calendar insertion.
      }
      ensureMeeting_(c,p,id,r,key,props);
      try { event=Calendar.Events.insert(event_(c,p,id,r),c.calendarId,{sendUpdates:c.sendCalendarInvitation?'all':'none'}); }
      catch(_) {
        // An insert may have succeeded despite a transport error. Never generate another event ID.
        event=findEvent_(c,id);
        if(!event) throw new Error('UNCERTAIN');
      }
      if(event.status==='cancelled' || !event.extendedProperties || event.extendedProperties.private.bookingFingerprint!==fingerprint) throw new Error('UNCERTAIN');
    }
    r.status='confirmed';
    props.setProperty(key,JSON.stringify(r));
    // Mail failure cannot turn a confirmed Calendar reservation into a failed booking.
    notify_(c,p,id,r,key,props);
    if(c.enableBookingLog && r.log==='notSaved') {
      try { logBooking_(c,p,id,r); r.log='saved'; }
      catch(_) { r.log='failed'; }
      try { props.setProperty(key,JSON.stringify(r)); } catch(_) { /* reservation remains durable */ }
    }
    const meeting=meetingDetails_(c,r);
    return {ok:true,bookingId:id,start:p.start,end:new Date(r.end).toISOString(),name:p.name,email:p.email,
      customerMailSent:r.customerMail==='sent',meetingMethod:c.meetingMethod,meetingUrl:meeting.url,meetingId:meeting.id,meetingPasscode:meeting.passcode,
      cancellationInstructions:c.cancellationInstructions};
  } catch(e) {
    const result=error_(e);
    return reservationStarted && result.code==='UNAVAILABLE' ? error_(new Error('UNCERTAIN')) : result;
  }
  finally { if(lock && lock.hasLock()) lock.releaseLock(); }
}
