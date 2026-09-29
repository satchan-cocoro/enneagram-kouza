function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('人を見るエニアグラム 受講前30分無料相談')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
  // Keep DEFAULT frame protection; do not set ALLOWALL. No mutation through GET.
}
function include_(file) { return HtmlService.createHtmlOutputFromFile(file).getContent(); }
// Owner runs this from the editor. Trailing underscore prevents google.script.run access.
function setupCheck_() {
  const c=config_();
  const cal=Calendar.Calendars.get(c.calendarId);
  if(cal.timeZone!==c.timezone) throw new Error('予約用CalendarのタイムゾーンをAsia/Tokyoにしてください。');
  busy_(c,[Date.now()]);
  if(c.enableBookingLog) SpreadsheetApp.openById(c.spreadsheetId).getName();
  MailApp.getRemainingDailyQuota();
  if(c.meetingMode==='zoomAutomatic') zoomToken_(zoomConfig_());
  console.log('設定・読み取り確認完了。予約・送信・外部利用者の実機テストは別途必要です。');
}
// Editor-only operational audit: no names, emails or consultation notes in logs.
function reviewPending_() {
  const props=PropertiesService.getScriptProperties().getProperties();
  const items=Object.keys(props).filter(k=>k.startsWith('BOOKING_') && k!=='BOOKING_CONFIG').map(k=>({key:k,...JSON.parse(props[k])}));
  console.log(JSON.stringify(items.filter(r=>r.status!=='confirmed' || r.customerMail!=='sent' || r.ownerMail!=='sent' || r.log==='failed')
    .map(r=>({key:r.key,start:r.start,status:r.status,customerMail:r.customerMail,ownerMail:r.ownerMail,log:r.log,zoomState:r.zoom && r.zoom.state,zoomId:r.zoom && r.zoom.id}))));
}
