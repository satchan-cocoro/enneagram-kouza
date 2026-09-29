# 人を見るエニアグラム｜受講前30分無料相談

**2026年9月29日更新：運用アカウントへの設定と実予約テストを完了し、Web Appの一般アクセスを確認済みです。LPへの公開接続を進めています。**

このリポジトリの設定例は資格情報を含まないテンプレートです。新しい環境にコピーする場合は、下記の設定・認証・テストを実施してください。既存環境で完了した確認内容は `../IMPLEMENTATION_REPORT.md` の冒頭に記載しています。
初期実装時点では未接続でしたが、その後、運用アカウントで認証・実予約・メール受信・Zoom参加画面・匿名アクセスを確認しました。受付日・時間、6時間前締切、前後15分、Zoom自動発行、公式LINEでの変更キャンセルは指定内容を反映済みです。認証情報などの未確定値は未設定です。

## 構成とファイル

GitHub PagesのLP → 通常リンクでApps Script Web App → `google.script.run` → Apps Script（所有者として実行）→ Zoom API / Google Calendar API / MailApp。
任意でGoogle Sheetsへ記録できます。Sheetsを使わなくても、CalendarとScript Propertiesに重複防止に必要な状態を保存します。

- `Code.gs`：画面配信、編集者用の設定確認・障害確認
- `Config.gs` / `config.example.json`：設定読み取り・厳格な検証／未設定テンプレート
- `CalendarService.gs`：複数CalendarのFreebusy、Asia/Tokyoで30分枠生成
- `BookingService.gs`：ロック、予約時再検証、Calendar作成、同じ受付キーの再送処理
- `Validation.gs`：入力検証、安全なエラー、受付番号生成
- `ZoomService.gs`：Server-to-Server OAuthと予約別Zoomミーティング発行
- `MailService.gs`：予約者確認メール・運営者通知
- `LogService.gs`：独立した任意のSheets記録（未選択・未接続）
- `index.html` / `styles.html` / `client-js.html`：日時→入力→確認→明示的な確定→完了
- `appsscript.json`：タイムゾーン、Calendar高度なサービス、OAuthスコープ
- `tests/booking.test.cjs`：Googleサービスのモックによるローカル試験
- LP側：`../index.html`、`../styles.css`、`../privacy.html`を追記。`../booking-config.js`、`../booking-link.js`を追加。

既存LPは静的HTML/CSS/JS、deployment baseは `/enneagram-kouza/`。対象取得コミットは `82dd038e9b3f1a99544cefb4e6c209f5626d3763`。既存の解析タグは見つからないため、analyticsは追加していません。
価格直後に相談を追加し、既存の「こんな人と、一緒に」→FAQの順序は維持しています。主CTA・コピー・画像・料金・既存フォームへのリンクは変更していません。

## Googleサービスと権限

| サービス | 目的・権限 |
|---|---|
| Apps Script / HtmlService | 所有者として予約画面・サーバー処理を実行 |
| Calendar API v3 | `calendar.events`：予約作成・再送照会。`calendar.readonly`：空き状況とCalendar設定確認 |
| Zoom API / UrlFetchApp | `script.external_request`：Zoomトークン取得・ミーティング作成。Zoom側に会議作成権限が別途必要 |
| MailApp | `script.send_mail`：予約者と運営者へのメール送信。受信箱を読む権限は不要 |
| PropertiesService / LockService | 設定・処理状態の保存と同時実行制御 |
| Sheets（選択した場合だけ） | `spreadsheets`：指定シートへ記録。下記の追加設定が必要 |

実行するGoogleアカウントは予約用Calendarへの書き込み権限、各busy Calendarの空き情報の読み取り権限が必要です。利用者にはCalendarのOAuth認証を要求しません。

## Script Properties一覧（値は公開しない）

予約条件は **`BOOKING_CONFIG`** にまとめます。Zoom自動発行では別途 `ZOOM_ACCOUNT_ID`、`ZOOM_CLIENT_ID`、`ZOOM_CLIENT_SECRET`、`ZOOM_HOST_USER_ID` の4個を所有者が設定します。JSON内のキーは次のとおりです。実際のJSONはリポジトリではなくApps Scriptのプロジェクト設定に保存してください。

| JSON内のキー | 入力する内容 |
|---|---|
| `timezone`, `durationMinutes` | 固定仕様：Asia/Tokyo、30分。テンプレートに記載済み |
| `calendarId` | 予約を書き込むCalendar ID |
| `busyCalendarIds` | 空き判定するCalendar IDの配列。予約Calendarは自動で追加。追加不要と判断した場合は空配列可 |
| `availabilityMode`, `dateAvailability` | 今回はdates。指定した2026年の9日間だけ受付。日付から時間帯配列への対応をテンプレートに設定済み |
| `availability` | 曜日別の受付時間。日曜0〜土曜6をキーに、`[[開始,終了],…]` を指定。時刻はHH:mm、30分単位、昇順、重複不可。未記載曜日は受付なし。24:00は終了に使用可。日またぎは曜日別に分割 |
| `minimumLeadTimeHours` | 何時間前まで受け付けるか。0以上の整数 |
| `maximumBookingDaysAhead` | 今回はnull。繰り返し日数ではなく指定日の一覧自体を受付範囲とします。weeklyモードでは1〜365の整数が必須 |
| `bufferBeforeMinutes`, `bufferAfterMinutes` | 相談前後の余白。0以上の整数 |
| `meetingMethod`, `meetingMode` | 今回はZoom / zoomAutomatic。予約ごとに会議を作成 |
| `meetingUrl` | 今回は空欄。Zoom発行後の参加URLを予約記録から使用。fixedモードの場合に固定URLを指定 |
| `cancellationInstructions` | 実際の変更・キャンセル方法。連絡先等を含む完成した案内文 |
| `ownerNotificationEmail` | 運営者通知先メール |
| `sendCalendarInvitation` | 招待送信を行うかをbooleanで決定。trueにする前に送信者・主催者情報の見え方をテスト |
| `enableBookingLog` | Sheetsを利用するかをbooleanで決定 |
| `spreadsheetId` | Sheetsを利用する場合のみ必須 |

`BOOKING_b…` はシステムが自動生成する処理記録です。手で新規作成しません。受付日時・終了日時・入力内容のSHA-256指紋・同意日時・Calendar/メール/ログの処理状態を保存し、氏名・メール・メモの平文は保存しません。Zoomの参加URL・ID・パスコード・発行状態もこの記録に保存するため、Script Propertiesの閲覧者を限定してください。指紋も個人情報に関連するデータとして管理してください。保存期間は未確定で、自動削除は設定していません。

受付時間の具体値はテンプレートに反映済みです。2026年9月30日、10月1・2・8・9・13・14日は9:00〜16:00、10月6日は9:00〜12:00、10月7日は9:00〜14:00。指定外の曜日・翌週には繰り返しません。終了時刻は相談終了の上限（最終開始は30分前）です。前後bufferは既存予定との間隔に適用し、この時間帯の外側に及ぶことがあります。`availability` に `{}` を明示指定すれば全曜日受付なしになります。前後bufferは候補相談の前後を拡張し、既存予定の本体と重なる候補を除外します。相談同士の余白は前後bufferの大きい方が確保されます。既存予定も個別の前後余白を持つ、という合算方式ではありません。

## ユーザー側の設定・公開手順

1. ご本人のGoogleアカウントで [Apps Script](https://script.google.com/) を開き、新しい独立プロジェクトを作成します。本番用とは別にテスト用プロジェクト・非公開Calendarを用意してください。
2. このフォルダ直下の `.gs` ファイルと3個の `.html` ファイルを同じ名前で作成して貼り付けます。`config.example.json`、README、testsはApps Scriptのコードファイルにしません。
3. プロジェクト設定でタイムゾーンをAsia/Tokyoにし、マニフェスト表示を有効にして `appsscript.json` をコピーします。「サービス」にGoogle Calendar API v3が有効になっていることを確認します。標準Google Cloudプロジェクトを使っている場合はCloud側でもCalendar APIを有効にします。
4. プロジェクト設定→スクリプトプロパティで、名前 `BOOKING_CONFIG` を作り、`config.example.json` の全未設定箇所を置き換えたJSONを値に貼ります。秘密の実値をGitに保存しないでください。
5. Google Calendarの「設定と共有」→「カレンダーの統合」で予約Calendar IDを取得し、`calendarId` に指定。非公開・Asia/Tokyoを確認し、不要な共有を外します。
6. 複数の予定表を利用する場合は、すべてのIDを `busyCalendarIds` に指定。読み取りできないCalendarが1個でもある場合、受付は停止する設計です。
7. `availabilityMode: dates` と `dateAvailability` の指定9日間を確認します。曜日別の `availability` は今回空のままです。
8. `minimumLeadTimeHours` は指定の6に設定済みです。
9. `maximumBookingDaysAhead` はnullに設定済み。指定日のみ受付するため、追加の日数設定は不要です。
10. 前後bufferは指定の15分に設定済みです。30分刻みのため、例えば10:00〜10:30を予約すると10:30枠は消え、次は11:00以降です。
11. 下記のZoom設定を実施します。接続方法はZoom自動発行、変更キャンセルは既存サイトの公式LINE（@887nlija）に設定済みです。運営者メールと招待メールの利用有無を決定します。
12. Sheetsが必要なら非公開のSheetを作り、IDを設定し、`enableBookingLog` をtrueにします。マニフェストの `oauthScopes` に `https://www.googleapis.com/auth/spreadsheets` を追加します。シート名 `Bookings` は初回記録時に作成されます。保存先の共有・タイムゾーンも確認してください。不要ならfalseにし、スコープは追加しません。
13. エディタで `setupCheck_` を選んで手動実行し、ご本人がGoogleの認証・権限付与を行います。この関数は会議・イベント作成・メール送信をしません。設定・読み取りとZoomのトークン取得を確認します。
14. 「デプロイ」→「テストデプロイ」からWebアプリとして確認します。`/dev` はスクリプトの編集権限がある人専用です。匿名利用の確認には、テスト専用プロジェクトを「自分として実行」「全員」でテスト用の `/exec` としてデプロイしてください。選択肢がないWorkspaceでは管理者の制限を確認します。これを本番URLとしてLPには設定しません。
15. テスト用のメールアドレスを使い、日時選択→入力→同意→確認→確定を通します。Calendarへの書き込みとメール送信が実際に行われます。
16. 非公開の30分イベント、JST、名前・メール・メモ、受付経路を確認します。終了時刻や夏時間のないAsia/Tokyo表記を確認してください。
17. 2ブラウザで同じ枠を表示し同時確定。1件だけ作成されることを確認。別のbusy Calendarに予定を入れた場合・繰り返し予定・終日予定・前後bufferも確認します。
18. 予約者確認メールと運営者通知の到着を確認します。MailAppの送信元にはGoogleアカウント情報が表示され得ます。招待を有効にした場合は、Calendarの主催者メール／Calendar IDや接続URL・説明欄が招待された人にどう見えるかも実際に確認し、許容できなければ招待をfalseにします。メールの送信元を完全に匿名化する機能はありません。
19. 全試験に合格し、保存期間と削除運用・プライバシー文面を決定した後に、ご本人が本番プロジェクトを「自分として実行」「全員」で新しいバージョンとしてデプロイします。本番Calendarへの切替は既存受付中のプロジェクトで突然行わず、専用本番プロジェクトを使用してください。
20. 本番Webアプリの `/exec` URLだけをLPの `booking-config.js` の `webAppUrl` に設定します。Calendar ID、メール、接続URLはLP側に入れません。URL未設定／形式不正時は予約リンクを表示せず「準備中」と表示します。
21. プロジェクトルートで `python3 -m http.server 8000 --bind 127.0.0.1` を実行し、`http://127.0.0.1:8000/#free-consultation` でLPをローカル確認します。Apps Script側はこの静的サーバーでは動きません。
22. 下記の本番前QAを行います。LP→Webアプリ→privacyリンク→完了を確認し、利用者視点で動作を確認できてから、ご本人の明示判断でLPのpush・GitHub Pages公開を行ってください。公開作業はユーザーの明示承認を得て実施します。

Sheetsを有効化する場合だけ、`privacy.html` の保管節に「受講前無料相談の予約履歴管理にGoogle Sheetsを使用し、当方が管理するスプレッドシートに予約情報を保管します。」を追記してください。現状は無料相談用Sheets利用を記載していません（既存の講座申込用スプレッドシートの記載は維持）。

## 予約競合・障害時の運用

- 公開関数は `doGet` / `availableSlots` / `bookConsultation`。その他の末尾 `_` 関数は `google.script.run` から呼び出せません。
- `LockService.getScriptLock` 内で再検証→予約枠の保留記録→Calendar作成を行います。Calendarの読込反映が遅れても保留記録で他の人の重複を防ぎます。1つのCalendarに複数の独立予約アプリを並行稼働させないでください。
- ロックはこのApps Script内で有効です。Calendar UIや他サービスから、再検証と作成の間に同じ時間へ外部書き込みが行われることまで原子的には防げません。専用予約Calendarと運営者の予定更新運用を合わせてください。
- Calendarが「予定なし」に設定された予定はFreebusyではブロックされません。相談できない予定は必ず「予定あり」にします。
- 受付キーを入力内容の指紋に結び付け、同じキーから同じCalendar event IDを生成します。同じ画面での再送はそのイベントを照会します。同一メール・同一枠で新しいキーを使っても、保留／予約済み枠により拒否されます。
- 書き込みの結果が不明な時は保留記録を自動解除しません。画面を閉じず同じ内容で再送してください。通信エラーの時に別の内容に変更して確定を続けるUIにはしていません。
- Calendar作成後のメール失敗は予約成功として返します。送信直前に状態を保存し、再試行でメールを自動再送しません。MailAppには厳密な一度だけ送信の保証がないため、通信途絶時は「送信確認できず」と案内し、運営者が確認します。
- エディタで `reviewPending_` を実行すると、保留／メール未完了／ログ失敗の受付番号と状態を確認できます。利用量に合わせて運営者が定期確認してください。メール通知の失敗を、同じメール機能だけで確実に通知することはできません。
- 保留が残る場合：対象 `BOOKING_b…` の接尾辞がCalendar event IDです。Calendarと実メールの状態を確認し、予約成立ならその予約を維持して必要な確認メールを手動送信します。イベントが存在しないこと・実行中処理がないことを確認し、受付を一時停止した上で、該当する保留プロパティだけを削除すると再受付できます。確認せず削除しないでください。
- 手動キャンセル：受付を一時停止し、該当Calendarイベントを取消、本人への連絡、任意Sheetの状態更新、対応する保留記録の削除をまとめて行います。Calendarだけ削除しても枠は自動復活しません。再開後は新しい受付キーを使用します。自動キャンセルURLはありません。
- 日程変更：新しい希望枠の空きを確認し、新規の予約処理と旧予約の取消を管理します。Calendarイベントだけを移動すると保留記録とずれるため行わないでください。
- Script Propertiesにも容量上限があります。運営者が決めた保存期間に従い、過去の記録、Calendar、メール、任意Sheetを整理します。期間は今回未設定で、自動削除・自動トリガーは追加していません。

## セキュリティ・公開前の注意

iframeの `ALLOWALL` はどのサイトからも埋め込み可能になるため使用しません。既定のフレーム保護を維持し、LPから通常リンクで遷移します。Apps Scriptのリクエストから信頼できるOrigin/Referer許可リストを実装したとは主張しません。GETは表示専用、確定は明示ボタン＋`google.script.run` です。

Calendarのタイトル・説明・参加者・場所等を空き枠レスポンスに返しません。設定・生のGoogleエラーも返しません。入力をHTMLとして挿入せず、Sheetの数式として解釈され得る入力はエスケープします。Zoomの参加URL・ID・パスコードは予約確定した本人へだけ返します。主催者専用のstart_urlは保存も返却もしません。

honeypot・検証・同一枠の重複防止は実装済みですが、本人メール認証や大規模bot対策ではありません。一般公開Webアプリの割当枠消費や複数の架空予約は完全には防げません。必要時はメール認証・受付数制限・CAPTCHAを別途検討してください（今回追加なし）。Googleのメール・実行時間・ストレージの割当にも留意します。

保存期間・削除方法・共有範囲・招待／送信者表示を決定するまでは本番公開しないでください。

## 検証

ローカル自動試験：`node --test booking-app/tests/*.test.cjs`。
更新後は自動試験47件成功。指定9日間・6時間境界・Zoom成功／失敗／再送もモック検証済みです。実施範囲・本番前QAは `../IMPLEMENTATION_REPORT.md` に記載。

## 確認した公式仕様

- [Web Apps：実行主体、/devテスト、デプロイ](https://developers.google.com/apps-script/guides/web)
- [XFrameOptionsMode：ALLOWALLの動作とクリックジャッキング](https://developers.google.com/apps-script/reference/html/x-frame-options-mode)
- [google.script.run：失敗ハンドラと末尾_の非公開関数](https://developers.google.com/apps-script/guides/html/communication)
- [LockService](https://developers.google.com/apps-script/reference/lock/lock-service)
- [Calendar Freebusy](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query)
- [Calendar Events insert：独自ID、private、attendees、sendUpdates](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)
- [Calendar Events get](https://developers.google.com/workspace/calendar/api/v3/reference/events/get)
- [MailApp](https://developers.google.com/apps-script/reference/mail/mail-app)

## Zoom自動発行の設定と復旧

今回の追加指示により、固定URL方式から予約ごとのZoom自動発行へ変更しました。会議は予約確定処理の中で発行し、相談時刻にホストのZoomアプリを自動起動する機能ではありません。当日は設定したホストアカウントでZoomを開始してください。

1. Zoomアカウントの所有者または必要な管理権限のある人が、Zoom App MarketplaceでServer-to-Server OAuthアプリを作成します。アカウントの権限によって作成可否が異なります。
2. 会議作成のgranular scope `meeting:write:meeting:admin` を追加します。権限の追加・アプリの有効化はご本人が行います。
3. Account ID、Client ID、Client Secretを、それぞれApps Scriptの `ZOOM_ACCOUNT_ID`、`ZOOM_CLIENT_ID`、`ZOOM_CLIENT_SECRET` へ保存します。チャットやリポジトリに貼らないでください。
4. 会議を主催するアカウント内ユーザーのZoom user IDまたはメールアドレスを `ZOOM_HOST_USER_ID` に設定します。Server-to-Server OAuthでは明示的にホストを指定します。
5. 更新したマニフェストの `script.external_request` を含めてGoogle側の権限を承認し、`setupCheck_` を実行します。Zoomトークンはその実行中のメモリのみで扱います。
6. テスト予約を行い、予定された30分会議、Asia/Tokyo、個別ID（PMIを不使用）、待機室あり、自動録画なし、予約者メールの参加URL・ID・パスコード、ホストとして開始できることを確認します。アカウント側の強制設定が優先される場合があるため実確認が必要です。

発行順：枠を保留 → Zoom作成 → Calendar作成 → 確認メール。Zoomにはサービス名・日時・時間・受付番号を送り、予約者の氏名・メール・相談メモはAPIリクエストに含めません。

Zoomの応答が途切れた場合、作成済みか判断できないため同じPOSTを自動反復しません。予約を成功表示せず枠を保留します。`reviewPending_` で対象を確認し、Zoom管理画面の会議説明にある受付番号と日時で照合してください。Google Calendar作成前にZoomだけ残る場合があります。

復旧は受付と実行中処理を停止してから行います。会議が存在し、該当予約と確認できた場合、対応するBOOKING記録の `zoom` を `{state:"ready",id:実ID,url:実参加URL,passcode:実パスコード}` に修復すれば、同じ受付キーの再送でその会議を再利用します（秘密値はScript Properties内のみ）。会議未作成を確認できた場合は `zoom` フィールドのみ解除して再送できます。不明なまま解除しないでください。不要なZoom会議は運営者が取消します。

予約取消・日程変更時は、Calendar・保留記録・通知に加えZoom会議の取消／日時更新も必要です。Zoomの自動削除・日程変更機能は実装していません。

公式仕様：[Server-to-Server OAuth](https://developers.zoom.us/docs/internal-apps/s2s-oauth/)、[アプリ作成](https://developers.zoom.us/docs/internal-apps/create/)、[Meetings API](https://developers.zoom.us/docs/api/meetings/)。
