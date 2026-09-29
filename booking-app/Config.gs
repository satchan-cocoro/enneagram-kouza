// All operator settings live in ONE Script Property named BOOKING_CONFIG (JSON).
const SERVICE_TITLE = '人を見るエニアグラム｜受講前30分無料相談';
const PRIVACY_URL = 'https://satchan-cocoro.github.io/enneagram-kouza/privacy.html';
function config_() {
  let c;
  try { c = JSON.parse(PropertiesService.getScriptProperties().getProperty('BOOKING_CONFIG')); }
  catch (_) { throw new Error('CONFIG'); }
  const required = ['calendarId','busyCalendarIds','availability','minimumLeadTimeHours',
    'maximumBookingDaysAhead','bufferBeforeMinutes','bufferAfterMinutes','meetingMethod',
    'meetingUrl','cancellationInstructions','ownerNotificationEmail','sendCalendarInvitation','enableBookingLog'];
  if (!c || required.some(k => c[k] === undefined || JSON.stringify(c[k]).includes('{{USER_CONFIG_REQUIRED}}')))
    throw new Error('CONFIG');
  if (c.timezone !== 'Asia/Tokyo' || c.durationMinutes !== 30 || Session.getScriptTimeZone() !== c.timezone) throw new Error('CONFIG');
  if (typeof c.calendarId !== 'string' || !c.calendarId.trim() || !Array.isArray(c.busyCalendarIds) ||
      c.busyCalendarIds.length > 49 || c.busyCalendarIds.some(x => typeof x !== 'string' || !x.trim())) throw new Error('CONFIG');
  for (const k of ['minimumLeadTimeHours','bufferBeforeMinutes','bufferAfterMinutes'])
    if (!Number.isInteger(c[k]) || c[k] < 0 || c[k] > 8760) throw new Error('CONFIG');
  c.availabilityMode = c.availabilityMode || 'weekly';
  if (!['weekly','dates'].includes(c.availabilityMode)) throw new Error('CONFIG');
  if (!(c.availabilityMode==='dates' && c.maximumBookingDaysAhead===null) && (!Number.isInteger(c.maximumBookingDaysAhead) || c.maximumBookingDaysAhead < 1 || c.maximumBookingDaysAhead > 365)) throw new Error('CONFIG');
  if (!emailValid_(c.ownerNotificationEmail) || typeof c.sendCalendarInvitation !== 'boolean' || typeof c.enableBookingLog !== 'boolean') throw new Error('CONFIG');
  for (const k of ['meetingMethod','cancellationInstructions'])
    if (typeof c[k] !== 'string' || !c[k].trim() || c[k].length > 2000) throw new Error('CONFIG');
  // Empty URL is an explicit choice for methods with no link, not an unset value.
  if (typeof c.meetingUrl !== 'string' || (c.meetingUrl !== '' && !/^https:\/\/[^\s<>]+$/.test(c.meetingUrl))) throw new Error('CONFIG');
  if (c.enableBookingLog && (typeof c.spreadsheetId !== 'string' || !c.spreadsheetId || c.spreadsheetId.includes('{{'))) throw new Error('CONFIG');
  if (!c.availability || Array.isArray(c.availability) || typeof c.availability !== 'object') throw new Error('CONFIG');
  for (const day of Object.keys(c.availability)) {
    if (!/^[0-6]$/.test(day) || !Array.isArray(c.availability[day])) throw new Error('CONFIG');
    let last = -1;
    for (const range of c.availability[day]) {
      if (!Array.isArray(range) || range.length !== 2) throw new Error('CONFIG');
      const a = minutes_(range[0]), b = minutes_(range[1]);
      if (a < 0 || b > 1440 || a >= b || a < last || a % 30 || b % 30) throw new Error('CONFIG');
      last = b;
    }
  }
  if(c.availabilityMode==='dates') {
    if(!c.dateAvailability || typeof c.dateAvailability!=='object' || Array.isArray(c.dateAvailability) || Object.keys(c.dateAvailability).length>366) throw new Error('CONFIG');
    for(const [date,ranges] of Object.entries(c.dateAvailability)) {
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date+'T00:00:00Z')) || new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date || !Array.isArray(ranges)) throw new Error('CONFIG');
      let last=-1;
      for(const range of ranges) {
        if(!Array.isArray(range) || range.length!==2) throw new Error('CONFIG');
        const a=minutes_(range[0]),b=minutes_(range[1]);
        if(a<last || a>=b || a%30 || b%30) throw new Error('CONFIG');
        last=b;
      }
    }
  }
  c.meetingMode=c.meetingMode || 'fixed';
  if(!['fixed','zoomAutomatic'].includes(c.meetingMode)) throw new Error('CONFIG');
  if(c.meetingMode==='zoomAutomatic') {
    if(c.meetingMethod!=='Zoom' || c.meetingUrl!=='') throw new Error('CONFIG');
    zoomConfig_();
  }
  c.busyCalendarIds = [...new Set([c.calendarId, ...c.busyCalendarIds])];
  return c;
}
function minutes_(s) {
  if (typeof s !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(s)) throw new Error('CONFIG');
  return Number(s.slice(0,2))*60+Number(s.slice(3));
}
