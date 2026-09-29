// Optional. Add the spreadsheets OAuth scope ONLY when enableBookingLog is true.
function logBooking_(c,p,id,r) {
  const book=SpreadsheetApp.openById(c.spreadsheetId);
  const sheet=book.getSheetByName('Bookings') || book.insertSheet('Bookings');
  if(!sheet.getLastRow()) sheet.appendRow(['booking ID','createdAt','name','email','start','end','note','Calendar event ID','status','consentAt']);
  if(sheet.getLastRow()>1 && sheet.getRange(2,1,sheet.getLastRow()-1,1).createTextFinder(id).matchEntireCell(true).findNext()) return;
  const safe=s=>/^[=+@\-\t\r\n]/.test(String(s)) ? "'"+s : s;
  sheet.appendRow([id,r.consentAt,safe(p.name),safe(p.email),p.start,new Date(r.end).toISOString(),safe(p.note),id,r.status,r.consentAt]);
}
