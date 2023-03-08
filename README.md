# autoKana2-vanilla
 自動フリガナ入力をするVanilla JSライブラリ

----
 Vanilla JS リメイク版 "jquery.autoKana2.js".


## 概要
　このJavascriptは、[Very Pinch](https://github.com/yongzhenlow/email-autocomplete)さんが作成した、autoKana2 1.0.31 を、Vanilla JS (ライブラリに依存しない素のJavascript)にリメイクしたものです。
　jQueryがなくても動作し、他のライブラリやテンプレートと競合しません。
　入力欄Ａに対して入力された文字のカナを自動的に取り出して入力欄Ｂに反映します。

### Download
　ダウンロードしたdist/autoKana2-vanilla.min.jsを自身の使用したいディレクトリに配置して使用して下さい。
　CDNを利用すると、jsファイルの設置は不要になります。


## Usage
* local
```javascript
<script src="autoKana2-vanilla.min.js"></script>
```
* CDN
```javascript
<script src="//cdn.jsdelivr.net/gh/GakutoMatsumura/autoKana2-vanilla@main/dist/autoKana2-vanilla.min.js"></script>
```

```html
<input id="kanji_input_id" name="kanji" type="text">
<input id="kana_input_id" name="kana" type="text">
```

```html
<script>
document.addEventListener("DOMContentLoaded", function(e) {
	autoKana("#kanji_input_id","#kana_input_id", {
		katakana: true,
		emptyInputCallback: function () { return true; }//戻り値にtrueを指定すると、空欄時にカナ欄をリセット。falseを指定するとそのまま過去のカナが残る
	});
});
</script>
```


## Settings
| Option | Type | Default | Description |
| --- | --- | --- | --- |
| katakana | bool | true | katakana or hiragana. |
| emptyInputCallback | function | return "true" is empty reset kana box. |


## Demonstration
[demo.html sample page (en.thilmera.com)](https://en.thilmera.com/project/t7GithubJS/repo/autoKana2-vanilla/demo/demo.cdn.html)

[demo.html source](./demo/demo.html)

[demo.cdn.html source](./demo/demo.cdn.html)


## Author
### Remake via Vanilla JS edition
* Gakuto Matsumura

[project site : t7GithubJS (en.thilmera.com)](https://en.thilmera.com/project/t7GithubJS/)

### Origin
* Very.Pinch

[origin repository link](https://github.com/VeryPinch/autoKana2)

 thank you.


## LICENSE
MIT License

