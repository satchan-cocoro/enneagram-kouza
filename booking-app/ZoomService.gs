// Credentials are set by the owner in Script Properties; never send them to the browser.
function zoomConfig_() {
  const props=PropertiesService.getScriptProperties(), result={};
  for(const key of ['ZOOM_ACCOUNT_ID','ZOOM_CLIENT_ID','ZOOM_CLIENT_SECRET','ZOOM_HOST_USER_ID']) {
    const value=props.getProperty(key);
    if(typeof value!=='string' || !value.trim() || value.includes('{{')) throw new Error('CONFIG');
    result[key]=value.trim();
  }
  return result;
}
function zoomToken_(z) {
  try {
    const response=UrlFetchApp.fetch('https://zoom.us/oauth/token',{
      method:'post',headers:{Authorization:'Basic '+Utilities.base64Encode(z.ZOOM_CLIENT_ID+':'+z.ZOOM_CLIENT_SECRET)},
      payload:{grant_type:'account_credentials',account_id:z.ZOOM_ACCOUNT_ID},
      muteHttpExceptions:true,followRedirects:false
    });
    if(response.getResponseCode()!==200) throw new Error('ZOOM_PENDING');
    const body=JSON.parse(response.getContentText());
    if(typeof body.access_token!=='string' || !body.access_token) throw new Error('ZOOM_PENDING');
    return body.access_token; // Memory only. No logs, properties or frontend exposure.
  } catch(_) { throw new Error('ZOOM_PENDING'); }
}
function ensureMeeting_(c,p,id,r,key,props) {
  if(c.meetingMode!=='zoomAutomatic') return;
  if(r.zoom && r.zoom.state==='ready') return;
  // A POST response may be lost after Zoom created the meeting. Never blindly retry it.
  if(r.zoom) throw new Error('ZOOM_PENDING');
  const z=zoomConfig_(),token=zoomToken_(z);
  r.zoom={state:'creating'};
  props.setProperty(key,JSON.stringify(r));
  try {
    const response=UrlFetchApp.fetch('https://api.zoom.us/v2/users/'+encodeURIComponent(z.ZOOM_HOST_USER_ID)+'/meetings',{
      method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+token},
      payload:JSON.stringify({topic:SERVICE_TITLE,type:2,start_time:p.start,duration:30,timezone:c.timezone,
        agenda:'予約受付番号: '+id, // No name, email, or consultation note sent to Zoom.
        settings:{use_pmi:false,waiting_room:true,join_before_host:false,auto_recording:'none'}}),
      muteHttpExceptions:true,followRedirects:false
    });
    if(response.getResponseCode()!==201) throw new Error('ZOOM_PENDING');
    const body=JSON.parse(response.getContentText());
    if(!body.id || typeof body.join_url!=='string' || !/^https:\/\/(?:[a-z0-9-]+\.)*zoom\.us\//i.test(body.join_url)) throw new Error('ZOOM_PENDING');
    r.zoom={state:'ready',id:String(body.id),url:body.join_url,passcode:typeof body.password==='string'?body.password:''};
    // Deliberately discard start_url (host privileges), token and raw response.
    props.setProperty(key,JSON.stringify(r));
  } catch(_) { throw new Error('ZOOM_PENDING'); }
}
function meetingDetails_(c,r) {
  if(c.meetingMode==='zoomAutomatic') {
    if(!r.zoom || r.zoom.state!=='ready') throw new Error('ZOOM_PENDING');
    return {url:r.zoom.url,id:r.zoom.id,passcode:r.zoom.passcode};
  }
  return {url:c.meetingUrl,id:'',passcode:''};
}
