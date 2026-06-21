# ビンカラビン

スマホ縦画面向けのブラウザゲームです。ビンの中の色の層を移し替え、すべてのビンを「空」または「同じ色だけで満たされた状態」にそろえるパズルです。

- 公開予定URL: https://chameleonjp.codeberg.page/binkarabin/
- game_slug: `binkarabin`
- ゲーム本体: `index.html` 1ファイル

## 操作方法

1. 名前入力後、ゲーム画面で「3、2、1、スタート」のカウントダウンを待ちます。
2. スタート後に移し元のビンをタップします。
3. 移し先のビンをタップします。
4. 移せる場合だけ、上に連続している同色の層を空き容量の範囲でまとめて移します。

カウントダウン中はタイマーが進まず、ビン操作も受け付けません。同じビンをもう一度タップすると選択解除できます。取り消しボタンで1手戻せます。リタイア時は確認後に結果画面へ進みますが、ランキング送信は行いません。カウントダウン中にリタイアした場合もランキング送信せず、終了時にはカウントダウンとタイマー処理を止め、結果画面後にゲーム処理を進めません。


## 20本版のゲーム構成

- ビン総数は20本です。
- 1本の容量は4層です。
- 色は16色で、各色4層ずつ、合計64層を使用します。
- 20本のうち16本に色が入り、4本は空ビンです。
- 盤面の中身は、解けることが分かっている固定盤面です。
- ゲーム開始ごとに、ビンの並び順だけをランダムに変えます。
- 色レイヤーの順番は毎回変えません。
- 解ける内容を保ちながら、見た目の配置に変化を出します。
- ランキングは20本版の記録として扱います。6本版の古い記録が残っている場合は、公開前に削除または管理者による初期化を推奨します。

## ランキング仕様

- スコア名: クリアタイム
- 送信値: ミリ秒の整数
- 表示: 秒、小数3桁
- 順位: 小さい値ほど上位 (`asc`)
- ランキング型: ベストスコア型
- 送信RPC: `submit_score`
- ランキング取得RPC: `get_best_score_ranking`
- 補助RPC: `get_game_play_stats`
- 使用テーブル/RPC: `public.games`, `public.game_scores`, `submit_score`, `get_best_score_ranking`, `get_game_play_stats`
- `public.scores` は使用しません。

## Supabase 登録メモ

```csv
game_slug,title,game_url,description,share_text,score_order,score_unit,score_scale,score_decimals,score_label,first_score_label,best_score_label,top_ranking_type,is_active,release_date
binkarabin,ビンカラビン,https://chameleonjp.codeberg.page/binkarabin/,ビンの中の色をそろえるパズルゲームです。,"ビンカラビン
ビンの中の色をそろえるパズルゲームです。
https://chameleonjp.codeberg.page/binkarabin/",asc,秒,1000,3,クリアタイム,初回タイム,ベストタイム,best,true,2026-06-14
```

`display_order` は既存ゲーム一覧の最後に追加する前提で、登録時に決めます。

## 実装メモ

公開URLは `index.html` 内の `GAME_URL` 定数1箇所で管理しています。他ゲーム導線は `https://chameleonjp.codeberg.page/chameleonjp_lab/` へ遷移します。ランキング送信は結果画面へ入った後に `submit_score` で自動で1回だけ実行し、送信値はミリ秒整数、表示は秒・小数3桁です。リタイア時は実行しません。Supabase は Publishable key を使用し、secret key / service_role key は使いません。
