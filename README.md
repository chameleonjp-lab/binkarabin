# ビンカラビン

スマホ縦画面向けのブラウザゲームです。ビンの中の色の層を移し替え、すべてのビンを「空」または「同じ色だけで満たされた状態」にそろえるパズルです。

- 公開予定URL: https://chameleonjp.codeberg.page/binkarabin/
- game_slug: `binkarabin`
- ゲーム本体: `index.html` 1ファイル

## 操作方法

1. 移し元のビンをタップします。
2. 移し先のビンをタップします。
3. 移せる場合だけ、上に連続している同色の層を空き容量の範囲でまとめて移します。

同じビンをもう一度タップすると選択解除できます。取り消しボタンで1手戻せます。リタイア時は確認後に結果画面へ進みますが、ランキング送信は行いません。

## ランキング仕様

- スコア名: クリアタイム
- 送信値: ミリ秒の整数
- 表示: 秒、小数3桁
- 順位: 小さい値ほど上位 (`asc`)
- ランキング型: ベストスコア型
- 使用テーブル/RPC: `public.games`, `public.game_scores`, `get_best_score_ranking`, `get_game_play_stats`
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

公開URLは `index.html` 内の `GAME_URL` 定数1箇所で管理しています。ランキング送信は結果画面へ入った後に自動で1回だけ実行し、リタイア時は実行しません。Supabase の secret key / service_role key は使いません。
