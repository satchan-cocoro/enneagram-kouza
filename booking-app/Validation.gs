function emailValid_(value) {
  return typeof value === 'string' && value.length <= 254 && /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(value);
}
function validate_(p) {
  if (!p || typeof p !== 'object' || p.website !== '' || p.consent !== true) throw new Error('INVALID');
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 100 || /[\r\n\x00-\x1f]/.test(p.name)) throw new Error('INVALID');
  if (!emailValid_(p.email) || typeof p.note !== 'string' || p.note.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(p.note)) throw new Error('INVALID');
  if (typeof p.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(p.requestId)) throw new Error('INVALID');
  if (typeof p.start !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:00\.000Z$/.test(p.start) || !Number.isFinite(Date.parse(p.start))) throw new Error('INVALID');
  return { name:p.name.trim(), email:p.email.trim().toLowerCase(), note:p.note.trim(), start:p.start, requestId:p.requestId };
}
function hash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8)
    .map(b => ('0'+((b+256)%256).toString(16)).slice(-2)).join('');
}
function error_(e) {
  const messages = {
    CONFIG:'予約受付の準備中です。設定が完了するまでお待ちください。',
    INVALID:'お名前・メールアドレス・希望日時とプライバシーポリシーへの同意を確認してください。',
    TAKEN:'申し訳ありません。この時間は先ほど予約されました。別の時間を選んでください。',
    LOCK:'ただいま処理が混み合っています。少し待ってから、同じ内容でもう一度お試しください。',
    UNCERTAIN:'予約結果を確認できませんでした。入力内容を変えず「予約結果を確認・再送」を押してください。解決しない場合は画面の受付番号を添えて運営者へご確認ください。',
    ZOOM_PENDING:'Zoomの発行結果を確認できませんでした。重複発行を防ぐため処理を保留しています。別の予約を作らず、画面の受付キーを添えて公式LINEへご連絡ください。',
    CANCELLED:'この受付番号の予約は取り消されています。変更・キャンセル方法に従って運営者へご確認ください。'
  };
  const code = messages[e.message] ? e.message : 'UNAVAILABLE';
  return {ok:false,code,message:messages[code] || '空き枠を取得できませんでした。時間をおいて再度お試しください。'};
}
