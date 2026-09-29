function dateLabel_(iso) { return Utilities.formatDate(new Date(iso),'Asia/Tokyo','yyyy年MM月dd日 HH:mm'); }
function notify_(c,p,id,r,key,props) {
  const time=dateLabel_(p.start)+'〜'+Utilities.formatDate(new Date(r.end),'Asia/Tokyo','HH:mm')+'（日本時間）';
  const meeting=meetingDetails_(c,r);
  const connection=c.meetingMethod+(meeting.url?'\n'+meeting.url:'')+(meeting.id?'\nミーティングID: '+meeting.id+'\nパスコード: '+meeting.passcode:'');
  const body=p.name+'さま\n\n「人を見るエニアグラム」受講前30分無料相談へお申し込みいただきありがとうございます。\n\nご予約日時: '+time+
    '\n相談時間: 30分\n\nこの無料相談は、講座への参加をご検討中の方のための相談時間です。\n講座内容や日程、参加について気になっていることなど、どうぞ気軽にお話しください。\n通常のエニアグラム個別セッションとは内容が異なります。'+
    '\n\n接続方法:\n'+connection+'\n\n変更・キャンセル方法:\n'+c.cancellationInstructions+
    '\n\n受付番号: '+id+'\n\n髙橋さつき\n人を見るエニアグラム';
  const mails=[['customerMail',p.email,'【人を見るエニアグラム】30分無料相談のご予約ありがとうございます',body],
    ['ownerMail',c.ownerNotificationEmail,'【予約受付】人を見るエニアグラム 30分無料相談',
      '名前: '+p.name+'\nメール: '+p.email+'\n日時: '+time+'\n任意相談メモ: '+p.note+'\nCalendar event ID: '+id+'\n接続方法: '+connection]];
  for(const [field,to,subject,bodyText] of mails) {
    if(r[field]!=='notSent') continue;
    try {
      // Mark BEFORE sending: a lost response must not automatically send duplicates.
      r[field]='unknown'; props.setProperty(key,JSON.stringify(r));
      MailApp.sendEmail({to,subject,body:bodyText,name:'髙橋さつき｜人を見るエニアグラム'});
      r[field]='sent';
    } catch(_) { r[field]='failed'; }
    try { props.setProperty(key,JSON.stringify(r)); } catch(_) { /* report conservatively on retry */ }
  }
}
