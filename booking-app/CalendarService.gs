function candidates_(c, now) {
  const day = Utilities.formatDate(new Date(now), c.timezone, 'yyyy-MM-dd');
  const midnight=Date.parse(day+'T00:00:00+09:00'), result=[];
  const lower=now+c.minimumLeadTimeHours*3600000;
  const upper=c.maximumBookingDaysAhead===null ? Infinity : now+c.maximumBookingDaysAhead*86400000;
  const dates=c.availabilityMode==='dates' ? Object.keys(c.dateAvailability).sort() :
    Array.from({length:c.maximumBookingDaysAhead+1},(_,d)=>Utilities.formatDate(new Date(midnight+d*86400000),c.timezone,'yyyy-MM-dd'));
  for(const date of dates) {
    const base=Date.parse(date+'T00:00:00+09:00'),weekday=new Date(base+9*3600000).getUTCDay();
    const ranges=c.availabilityMode==='dates' ? c.dateAvailability[date] : c.availability[String(weekday)] || [];
    for(const range of ranges) {
      for(let m=minutes_(range[0]);m+30<=minutes_(range[1]);m+=30) {
        const start=base+m*60000;
        if(start>=lower && start+1800000<=upper) result.push(start);
      }
    }
  }
  return [...new Set(result)].sort((a,b)=>a-b);
}
function busy_(c, starts) {
  if(!starts.length) return [];
  const min=Math.min(...starts)-c.bufferBeforeMinutes*60000;
  const max=Math.max(...starts)+(30+c.bufferAfterMinutes)*60000;
  const data=Calendar.Freebusy.query({timeMin:new Date(min).toISOString(),timeMax:new Date(max).toISOString(),
    timeZone:c.timezone,items:c.busyCalendarIds.map(id=>({id}))});
  const blocks=[];
  for(const id of c.busyCalendarIds) {
    const entry=data.calendars && data.calendars[id];
    if(!entry || (entry.errors && entry.errors.length) || !Array.isArray(entry.busy)) throw new Error('UNAVAILABLE');
    for(const b of entry.busy) {
      const start=Date.parse(b.start), end=Date.parse(b.end);
      if(!Number.isFinite(start) || !Number.isFinite(end) || end<=start) throw new Error('UNAVAILABLE');
      blocks.push({start,end});
    }
  }
  return blocks;
}
function overlaps_(start, blocks, c) {
  return blocks.some(b => start-c.bufferBeforeMinutes*60000 < b.end && start+(30+c.bufferAfterMinutes)*60000 > b.start);
}
// Ledger prevents races even if Calendar's availability read briefly lags behind a write.
function ledger_(except) {
  const props=PropertiesService.getScriptProperties().getProperties();
  return Object.keys(props).filter(k=>k.startsWith('BOOKING_') && k!=='BOOKING_CONFIG' && k!==except)
    .map(k=>JSON.parse(props[k])).map(r=>({start:r.start,end:r.end}));
}
function availableSlots() {
  try {
    const c=config_(), starts=candidates_(c,Date.now()), blocks=busy_(c,starts).concat(ledger_());
    return {ok:true,slots:starts.filter(s=>!overlaps_(s,blocks,c)).map(s=>new Date(s).toISOString())};
  } catch(e) { return error_(e); }
}
function event_(c,p,id,record) {
  const resource={id,summary:SERVICE_TITLE,visibility:'private',transparency:'opaque',
    start:{dateTime:p.start,timeZone:c.timezone},end:{dateTime:new Date(record.end).toISOString(),timeZone:c.timezone},
    description:'予約者名: '+p.name+'\n予約者メール: '+p.email+'\n予約受付経路: 人を見るエニアグラムLP\n任意相談メモ: '+p.note,
    extendedProperties:{private:{bookingFingerprint:record.fingerprint,privacyConsentAt:record.consentAt}},
    guestsCanInviteOthers:false,guestsCanModify:false,guestsCanSeeOtherGuests:false};
  const meeting=meetingDetails_(c,record);
  if(meeting.url) resource.location=meeting.url;
  if(meeting.id) resource.description+='\nZoomミーティングID: '+meeting.id+'\nパスコード: '+meeting.passcode;
  if(c.sendCalendarInvitation) resource.attendees=[{email:p.email}];
  return resource;
}
function findEvent_(c,id) {
  try { return Calendar.Events.get(c.calendarId,id); }
  catch(e) {
    // Fail closed unless the API explicitly identifies a missing event.
    if(/\b404\b|Not Found/i.test(String(e.message))) return null;
    throw new Error('UNCERTAIN');
  }
}
