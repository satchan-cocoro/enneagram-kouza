# 実装報告：受講前30分無料相談

> 現在の状態（2026年9月29日更新）：Google・Zoomの設定と実予約テストを完了。Calendar登録、Zoom発行、予約者確認メールと運営者通知の受信、Zoom参加画面、予約後の枠除外、テスト予約削除後の枠復旧を確認しました。Calendar登録・メール受信・Zoom参加画面・削除・匿名アクセスはユーザー本人からの確認報告を含みます。Web Appは全員アクセスへ変更済み、シークレットウィンドウでの表示もユーザー確認済み。LPの予約URLは設定済みです。以下の初期実装時の未接続・未公開という記載は履歴として残しています。実同時予約競合はローカル試験のみで、実環境の同時実行試験は未実施です。保存期間・定期整理は運営上の継続確認事項です。

2026年9月29日。コードとLP変更は作成済みです。**Google Calendar未接続・Apps Script未認証・未デプロイのため、まだ本番利用できません。git push / GitHub Pages deployも行っていません。**

## 1. 追加・変更したファイル

変更：`index.html`、`styles.css`、`privacy.html`。
追加：`booking-config.js`、`booking-link.js`、この報告書、`booking-app/` 以下。

`booking-app/`：`Code.gs`、`Config.gs`、`CalendarService.gs`、`BookingService.gs`、`MailService.gs`、`Validation.gs`、`LogService.gs`、`ZoomService.gs`、`index.html`、`styles.html`、`client-js.html`、`appsscript.json`、`config.example.json`、`README.md`、`tests/booking.test.cjs`、`tests/lp.test.cjs`。

取得元：公開GitHubリポジトリ `satchan-cocoro/enneagram-kouza`。取得時HEAD：`82dd038e9b3f1a99544cefb4e6c209f5626d3763`。

既存HTMLは、新規セクションと2個のscript読込を取り除くと取得元とバイト単位で一致することを自動検証しました。既存CSSは末尾への追記のみ。Canvas / Ink / green / signal等を再利用し、相談CTAは既存の細線リンクのスタイルです。価格直後→無料相談→既存fit→既存FAQの順で、既存セクション同士の順序は変えていません。

## 2. Architecture

GitHub Pages LP → Apps Script Web Appの通常リンク → `google.script.run` → 所有者アカウントでZoom API・Calendar API → MailApp。任意でSheets。

iframeは使用しません。Google公式仕様でALLOWALLが任意サイトへの埋め込みを許可することを確認し、既定のフレーム保護＋通常リンクのfallback方式にしました。LPの相談セクションは常に残ります。設定前は「準備中」と表示します。

サーバーは複数CalendarのFreebusy、JSTの30分枠、受付曜日時間、lead time、horizon、前後bufferを確認します。確定時はScriptLockで処理を直列化し、空き状況を再検証します。Calendarの反映待ちによる競合を避けるため、Script Propertiesに枠の保留を保存します。再送は同一event IDで照会します。

## 3–4. Google services / OAuth

Apps Script、HtmlService、Calendar API v3、MailApp、PropertiesService、LockService、UrlFetchApp、Zoom API。Sheetsは独立した任意機能で、未選択・未接続です。

マニフェストのOAuth：`calendar.events`、`calendar.readonly`、`script.send_mail`、`script.external_request`。Zoom側の会議作成scopeも必要です。
Sheetsを使うと決めた場合のみ `spreadsheets` スコープを追加します。本人による認証が必要です。利用者にCalendarアクセス権を要求する設計ではありません。

## 5–6. Script Properties / 未確定値

設定するプロパティ：`BOOKING_CONFIG`（JSON）、`ZOOM_ACCOUNT_ID`、`ZOOM_CLIENT_ID`、`ZOOM_CLIENT_SECRET`、`ZOOM_HOST_USER_ID`。システム管理：`BOOKING_b…`（処理状態）。

未確定のJSONキー：`calendarId`、`busyCalendarIds`、`ownerNotificationEmail`、`sendCalendarInvitation`、`enableBookingLog`。Zoom側の4プロパティも未設定です。受付日程・6時間前締切・前後15分・Zoom自動発行・公式LINEは反映済みです。Sheets使用時は `spreadsheetId` も必要です。

固定仕様は `timezone` と `durationMinutes`。実値を公開ファイルへ書き込んでいません。未設定テンプレートのままでは設定エラーになり、予約を受け付けません。

さらに、実際の個人情報保存期間と削除運用、送信元／主催者情報の見え方、本番Web App URL、Googleアカウントの権限・公開範囲の確認が必要です。

## 7–9. 実行した試験・成功・未実施

実行：`node --test booking-app/tests/*.test.cjs` → **47件成功、0件失敗**。
`git diff --check` 成功。

自動テストはGoogleサービスをモックに置き換えています。実Calendarの動作証明ではありません。

| 要件 | ローカルでの結果 | Google実環境での状態 |
|---|---|---|
| A 空き枠のみ表示 | 成功。lead/horizon/曜日/bufferも検証 | 未実施 |
| B 既存予定がある枠を除外 | 成功。複数Calendar・読取失敗時の受付停止 | 未実施。実予定・繰返し・終日も要確認 |
| C 2ブラウザ同時予約 | ロック中の別処理拒否・異なる利用者の競合・古い空き情報でも1件のみをモック検証 | 実2ブラウザ試験は未実施 |
| D 30分イベント | 作成リソース検証成功 | 未実施 |
| E Asia/Tokyo | 枠生成・イベント・タイムゾーン不一致時の拒否を検証 | 実Calendar設定は未確認 |
| F email validation | サーバー拒否試験成功 | 実配送は未実施 |
| G privacy同意必須 | サーバー試験＋ブラウザで未同意時に進めないことを確認 | Web App上は未実施 |
| H 確認メール | モック送信・失敗時の成功維持・再送重複防止を検証 | 配送／迷惑メール判定は未確認 |
| I owner通知 | モック宛先・送信件数検証成功 | 実配送は未実施 |
| J mobile 375px | LP／予約フォームのローカル表示確認。DOM幅・scrollWidthとも375px | Apps Script配信下・実端末は未実施 |
| K keyboard | 同意Space、確認Enter、確定Enter、確認・完了見出しへのfocusを確認 | スクリーンリーダー・実Web Appは未実施 |
| L LP→booking | URL設定時の通常リンク生成／不正URL拒否を自動試験。入力→確認→完了は模擬画面で確認 | 実デプロイURLとの通し試験は未実施 |
| M fallback | iframeを使わず通常リンク方式。未設定・/dev URLの拒否を検証 | 実/execへの遷移は未実施 |
| N eventが1件のみ | 二重送信・別受付キー・別メール・応答途絶後再送をモックで検証 | 実Calendar件数は未確認 |

その他：同一受付キーでの入力改変、honeypot、過長メモ、不正日時、設定欠落、機密・生のエラーを返さないこと、任意Sheet失敗でも予約を維持すること、既存LP内容維持を検証済み。

ローカルのブラウザ確認は `work/` 内の模擬Google応答を使っています。実予約もメール送信も行っていません。模擬画面は本番コードに含めていません。付属の画像もこのローカル試験の記録です。

追加で必要：Google認証、編集者以外／匿名アクセス、実際の招待、送信元表示、発行されたZoom接続先、任意Sheetsの正常記録と共有設定、Google割当上限時の実際の挙動、公開LPとの接続。

## 10. privacy.html

氏名・メール・希望日時・任意メモ・受付番号・同意日時と、その利用目的を追記。Apps Scriptでの受付、Calendarでの保管、MailAppでの確認・通知、Script Propertiesでの状態管理を記載。既存の講座申込情報の記載は維持。

無料相談用Sheetsは未決定なのでその利用は追記していません。有効化する場合だけ追記する文面をREADMEに用意しました。保存期間は創作していません。公開前に運営者側で決定が必要です。

## 11. Security / 運用上の制約

秘密値はScript Properties。空き枠APIは利用可能日時のみ返却し、予定のタイトル・内容・参加者・場所は返しません。確定後だけ、本人へ日時・入力情報・接続方法を返します。Calendarイベントはprivateです。

招待は運営者が明示的に選択し、主催者メール等の表示を確認するまで有効化しません。MailApp自体の送信元にも所有者アカウント情報が表示される可能性があります。

最低限の入力検証・honeypot・重複防止を実装しました。大量bot、メールの本人性、別システムからの同時Calendar書き込みまで完全には防げません。複数の予約アプリで同じCalendarへ書く運用は避けます。外部CAPTCHA等は追加していません。

Freebusyは「予定あり」をブロックします。「予定なし」に設定したイベントも相談不可にしたい場合はCalendar側で「予定あり」にします。

通信途絶時の枠の保留は勝手に消しません。手動キャンセル時はCalendarと保留記録を両方処理します。メールは重複防止のため自動再送せず、送信状態不明・失敗時は運営者が確認します。READMEに確認・復旧手順を記載しました。保存期間と定期整理の運用が必要です。

## 12–14. Deploy・LP接続・本番利用の条件

[booking-app/README.md](booking-app/README.md) に、プロジェクト作成→コード配置→JST→Script Properties→権限承認→テストdeploy→実予約・競合・メール試験→本人による本番deploy→URLを `booking-config.js` へ設定→ローカルLP確認→本番前QA、の22段階を記載しました。

この順序のGoogle側作業はまだ行っていません。現在のLPのWeb App URLは空欄です。**設定・認証・実試験・本人による公開が完了するまで、Google Calendar同期済み／本番利用可能とは判定しません。**

## 追加指定の反映

受付日は2026年として、9/30、10/1・2・8・9・13・14は9:00〜16:00、10/6は9:00〜12:00、10/7は9:00〜14:00を設定しました。相談はこの時間内に終了します。指定日以外には繰り返しません。予約は6時間前まで、前後15分。指定日一覧が受付上限となるため、別の日数を推測せず `maximumBookingDaysAhead:null` を日付指定モードに限り認めています。

Zoom自動発行を今回の追加指示として実装しました。予約ごとに会議を作り、Calendar・予約者／運営者メール・完了画面へ参加情報を渡します。主催者専用URLとアクセストークンは返却・保存しません。発行応答が不明な場合は自動で再発行せず、運営者による照合まで保留します。ZoomとCalendarの完全な分散トランザクションはないため、部分成功の手動復旧手順をREADMEに追記しました。

変更・キャンセル先は既存legal.htmlに記載された公式LINE（@887nlija）です。Zoom利用・APIへ送る情報・接続情報の保管についてprivacy.htmlにも追記しました。

追加試験12件：9日間の候補114枠（既存予定や締切の適用前）、短い日の終了、6時間ちょうどの境界、指定外の日の除外、無効日付、15分buffer、Zoom発行結果の反映、再送での重複防止、応答途絶、HTTPエラー、認証不足、Calendarだけ失敗した際のZoom再利用。すべてモックで成功しました。**Zoomアプリ作成・資格情報設定・実会議作成・実メール配送は未実施です。公開も行っていません。**
