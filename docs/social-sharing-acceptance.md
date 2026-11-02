# 固定 SNS 画像と共有表示受入

## 変更範囲
- 固定1200×630 PNGは実コードの `BASE_STAGE_20` / `COLORS` / `SYMBOLS` / `SYMCOLOR` と瓶の角丸・4層の描画構成を使用した紹介用再構成。20本/16色/空4本を保ち、個人の成績や名前を載せない。開始時の瓶順シャッフルとは区別した基礎配置。
- 編集元SVGと `tools/render-social-preview.cjs` は非配信。生成は同スクリプトでSVGを書き出しSVG対応レンダラでPNG化。実行時は既存単一HTMLと固定PNGのみ。
- OG/Twitter画像/寸法/alt、全15言語のhome/clear/retire共有に正式2タグ `#ビンカラビン #ゲーム制作` を付与。小数3桁・今回手数・リタイア文言・名前非掲載を保つ。
- 独立copyボタンを追加せず、Xが開けない時だけの既存コピーdialogを保持。パズル/ID/点数/保存情報/匿名開始統計は変更しない。

## 検査の区別
- metadataと15言語共有の16件は変更前失敗→変更後成功。全65 unit、15言語78文字列、HTML内4scriptの構文確認。
- 新 `tools/share-visual.cjs` は全HTTPをHTML直接fulfill・ランキング取得/X intent mock以外abort、SW/WS遮断。公開スコアだけでなく独立play統計の送信試行も0を必須とする。
- 表示用に既存復元経路へ匿名の固定結果（12.345秒/60手）を渡し、clear/retire双方を検査。実パズルクリアや本番記録ではない。既存browser-smokeの実pour操作/統計契約は保持する。
- 15言語×縦横×home/clear/retire、黒白X/44px/全rect収容/中心hit/実文言、今回tapのfresh intent/blocked時コピー/結果不変を確認。非表示・祖先opacity0・overflowclip対照を含む。
- 新browser結果と各engine画像実見はbranch CI終端後に受領し、成功前にDraft作成しない。スクロール後の操作位置画像と一画面全体の同時表示を混同しない。
- 配信検査はPNGだけ固定allowlistで追加し、ステージングした全bytes一致を確認する。SVG/ツール/資料は配信しない。

## 公開と復元
- 正式共有/canonicalの https://chameleonjp.codeberg.page/binkarabin/ を維持。GitHub画像URLは既存移行先の準備で、Codeberg更新・実験場切替・公開Xカード反映は別途未確認。
- 限定作業branch検証を追加し、Pages artifact/deployはmain pushだけへ明示。権限/runner/Pages設定は変更しない。
- 本人iPhone Safari実機は未確認。マージ後に正しい配信commit/PNG/縦横共有を確認。復元は今回差分revert PR、利用者記録の消去不要。

## 初回可視検査の root geometry 是正
初回CIはportrait成功後、landscapeのroot scrollY=323で検査が失敗。診断でXはviewport内 y=176..225/中心hit正常、HTMLのgetBoundingClientRect.top=-323 とclientHeight=402を足し合わせた検査側座標誤りと確認。CSSOM Viewのroot clientHeight/clientWidthはviewport寸法の規則に基づきdocument.scrollingElementだけclip原点を0とする（https://drafts.csswg.org/cssom-view/#dom-element-clientheight 、2026-11-02確認）。製品CSSは変更せず、通常overflow祖先clipとviewport全rect検査は保持。scrolledroot positive/通常clip negative/画面端欠け negativeの3unit（旧1失敗→全成功）、実browser部分clipとfixed上端欠け対照を追加。失敗画像は故障注入対照と本受入失敗を区別する。

## 空ランキング案内の読みやすさ
新CI画像で「まだ記録がありません」が通常参加者行の先頭2.2rem列だけに入り縦に細く折り返す既存問題を実見。`li[data-i18n="noRecords"]` だけblock化し、通常順位/名前/点数3列は保持。取得失敗は別の `rankingReadStatus` 表示であり、表示経路を変更しない。CSS対照は旧失敗→新成功、各言語/方向で空messageのblock表示と通常参加者の3span/gridを検査し空表示へ復元する。X非表示原因とは別。
