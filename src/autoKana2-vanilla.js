/*! autoKana2-vanilla 1.0.31.3
 * MIT License
 * (c) 2023 Gakuto Matsumura (http://github.com/GakutoMatsumura)
 * Based on the autoKana2(1.0.31) library created by:
 * (c) 2016 Very.Pinch (very.pinch@gmail.com)
 * Based on the AutoKana library created by:
 * (c) 2013 Keith Perhac @ DelfiNet (http://delfi-net.com)
 * Based on the AutoRuby library created by:
 * (c) 2005-2008 spinelz.org (http://script.spinelz.org/)
*/
(function (window, document) {
	window.autoKana2 = function (kanjiElement, kanaElement, options) {

		// キーボードを１タイプで入力できるJIS X0208の文字を対象とする　＊゛と゜を追加
		const ruby_pattern = new RegExp("[^　ぁ-ゖァ-ヶＡ-Ｚａ-ｚ０-９‘～｀！＠＃＄％＾＆＊（）＿ー－＝＋｛｝「」［］￥＼｜；：’”＜＞、。，．・？／♪€…☆→○×÷〒々〆゛゜]", "g");
		// 英数記号削除用
		const check_pattern = new RegExp("[^　ぁ-ゖァ-ヶー]", "g");//＊ひらがなを追加
		// 末尾のｎチェック用(ｎｎ自動保管対策)
		const n_pattern = new RegExp("[ｎＮnN]", "g");
		// 入力途中のｍチェック用(MS-IME対策)
		const m_pattern = new RegExp("[^ｍＭmM]", "g");
		// カタカナに濁点・半濁点を含むパターン
		const dakuten_pattern = /[\u3041-\u3096\u30A1-\u30F6]+/g;///[\u3041-\u3096\u30A1-\u30FA\u30FD\u30FF\u3099-\u309C]+/g;


		var elKanji = document.querySelector(kanjiElement);
		var elKana = document.querySelector(kanaElement);
		if (!elKanji || !elKana) return;
		elKanji.dataset.notSupport = 0;

		var lastRubyStr = "";
		var beforeCommitStr = "";
		var orgText = "";
		var lastOrgInput = "";
		var msimeFlag = false;
		var defaultText = "";
		var spCaptured = false;
		var lastText = "";
		var selectText = "";
		var ff_msimeFlag = false;
		var ua = (navigator && navigator.userAgent) ? navigator.userAgent.toLowerCase() : '';
		//var ver = navigator.appVersion.toLowerCase();

		// オプション設定
		const settings = Object.assign(
			{
				"katakana": false,
				"notSupportAlert": false,
				"addRubyCallback": function (text) { },
				"emptyInputCallback": function () { return true; }//戻り値にtrueを指定すると、空欄時にカナ欄をリセット。falseを指定するとそのまま過去のカナが残る
			},
			options
		);

		// IEとEdgeはIME確定の挙動が変なので個別に対応する
		var isMSIE = (ua.indexOf("msie") > -1) && (ua.indexOf("opera") == -1);
		var isIE11 = (ua.indexOf("trident/7") > -1);
		var isIE = isMSIE || isIE11;
		var isEdge = (ua.indexOf('edge') > -1);
		var isFirefox = (ua.indexOf('firefox') > -1);
		var isSafari = (ua.indexOf('safari') > -1) && (ua.indexOf('chrome') == -1);
		//var isiPhone = (ua.indexOf('iphone') > -1);// no use
		//var isiPad = (ua.indexOf('ipad') > -1);// no use
		//var isiOS = isiPhone || isiPad;// no use
		//var isAndroid = (ua.indexOf('android') > -1);// no use

		var isOpera = (ua.indexOf('Opera') > -1);
		var isOpera42 = false;
		if ((ua.indexOf("chrome") > -1) && (ua.indexOf("opr") > -1)) {
			isOpera = true;
			let st = ua.indexOf("opr");
			if ((ua.slice(st + 4).indexOf("42.0") > -1) || (ua.slice(st + 4).indexOf("43.0") > -1)) {
				isOpera42 = true;
			}
		}

		// Chromeの55.0.xはcompositionupdateの挙動が変なので個別対応とする
		// 次のバージョンでは元に戻る事を期待して暫定対応としてバージョン決め打ちにする
		var isChrome = false;
		var isChrome55 = false;
		if ((ua.indexOf("chrome") > -1) && (ua.indexOf("opr") == -1)) {
			isChrome = true;
			let st = ua.indexOf("chrome");
			let ed = ua.indexOf(" ", st);
			if ((ua.substring(st + 7, ed).indexOf("55.0") > -1) || (ua.substring(st + 7, ed).indexOf("56.0") > -1)) {
				isChrome55 = true;
			}
		}
		var isNintendo = (ua.indexOf("mobile nintendobrowser") > -1);
		elKanji.addEventListener("change", function (e) {
			var nowText = elKanji.value;
			if ( (!nowText || nowText.length == 0 ) && settings.emptyInputCallback()) resetEmptyKana();
		});

		elKanji.addEventListener("keyup", function (e) {
			if (e.keyCode === 8/*backspace*/ || e.keyCode === 0x2E/*delete*/) {
				spCaptured = false;
				var nowText = elKanji.value;
				if (nowText.length === 0) {
					if (settings.emptyInputCallback()) resetEmptyKana();
				} else {
					if (nowText.substring(nowText.length - 1) === "　") spCaptured = true;
				}
			}
		});

		elKanji.addEventListener("focus", function () {
			elKanji.dataset.notSupport = 0;
			defaultText = elKanji.value;
			if (defaultText.length > 0 && defaultText.slice(defaultText.length - 1) === "　") spCaptured = true;
		});

		if(settings.notSupportAlert) {
			elKanji.addEventListener("blur", function () {
				if (elKanji.dataset.notSupport === 1) {
					alert("正しくルビを取得出来無かった可能性が有ります。");
				}
			});
		}

		elKanji.addEventListener("compositionstart", function (e) {
			lastRubyStr = "";
			selectText = "";
			orgText = elKanji.value;
			// MS-IME対策(IME未確定状態でクリックするとcompositionendイベントが発生する)
			if (isIE || isEdge || isFirefox) {
				selectText = elKanji.value.slice(elKanji.selectionStart, elKanji.selectionEnd);
				if (selectText.length > 0) {
					orgText = orgText.slice(0, elKanji.selectionStart) + orgText.slice(elKanji.selectionEnd, orgText.length);
					if (isFirefox && beforeCommitStr.length > 0 && e.originalEvent && beforeCommitStr === e.originalEvent.data) {
						ff_msimeFlag = true;
					}
				} else {
					if (beforeCommitStr.length > 0 && e.originalEvent && beforeCommitStr === e.originalEvent.data) {
						let ruby = elKana.value;
						elKana.value = ruby.substring(0, ruby.length - beforeCommitStr.length);
						lastRubyStr = e.originalEvent.data;
						msimeFlag = true;
					}
				}
			}

			beforeCommitStr = "";
			lastText = "";
			if (window.getSelection) {
				if (elKanji.selectionStart < elKanji.selectionEnd) {
					if (orgText.length > 0 && orgText.substring(elKanji.selectionStart - 1, 1) === "　") spCaptured = true;
				}
			}
			if (isChrome55 || isOpera42) {
				if ((elKanji.selectionStart < elKanji.selectionEnd) || elKanji.selectionEnd < orgText.length) {
					lastText = orgText.substring(elKanji.selectionEnd);
					orgText = orgText.substring(0, elKanji.selectionStart);
				}
			}
			if (!spCaptured && (isChrome || isOpera || isSafari || isNintendo)) {
				// 全角SPの入力でcompositionstartイベントが発生しないブラウザは、ここで救済する
				for (let i = orgText.length - 1; i > -1; i--) {
					const lastChar = orgText.substring(i, 1);
					if (lastChar === "　") {
						elKana.value += lastChar;
					} else {
						break;
					}
				}
			}
		});

		elKanji.addEventListener("compositionupdate", function (e) {
			var orgInput = e.data;
			var rubyStr = orgInput.toWideCase().replace(ruby_pattern, ""); // 半角カナ入力を考慮して全角に揃える
			var ieSaveFlag = false;
			if (orgInput.toWideCase().length === rubyStr.length) {
				// ルビ取得対象外の文字が混じってない場合
				spCaptured = false;
				// 全角片仮名に変換して記号を取り除く
				var lastRubyCheckStr = lastRubyStr.toWideCase().toKatakanaCase().replace(check_pattern, "");
				var rubyEditStr = rubyStr.toWideCase().toKatakanaCase();
				var rubyCheckStr = rubyEditStr.replace(check_pattern, "");

				if (lastRubyCheckStr.length > 0 && rubyCheckStr.length > 0 &&
					lastRubyStr.toWideCase().toKatakanaCase() === rubyEditStr) {
					// 平仮名←→片仮名変換は無視する
					return;
				}

				if ((isChrome55 || isOpera42)) {
					// Chrome 55.0.x はcompositionupdateのイベント引数で入力文字が1文字づつしか取得出来ないので
					// setTimeoutで現在入力中のテキストを取得して補完する
					setTimeout(function () {
						var nowText = elKanji.value;
						if (lastText.length > 0) {
							nowText = nowText.substring(0, nowText.length - lastText.length);
						}

						if (nowText.substring(0, orgText.length) === orgText && nowText.substring(nowText.length - rubyStr.length) === rubyStr) {
							rubyStr = nowText.substring(orgText.length, nowText.length);
							rubyEditStr = toWideCase(rubyStr).toKatakanaCase();
							rubyCheckStr = rubyEditStr.replace(check_pattern, '');
						}

						if (lastRubyCheckStr.length > 0 && rubyStr.length > 0 && rubyCheckStr.length === 0) {
							// かな→英数字記号変換は無視する
							return;
						}

						if (elKanji.selectionStart === elKanji.value.length) {
							const lastChar = rubyEditStr.substring(rubyEditStr.length - 1).replace(check_pattern, '');
							if (lastChar.length !== 0) {
								let testChar = '';
								let i = lastRubyStr.length - 1;
								do {
									if (lastRubyStr.charAt(i).toKatakanaCase().replace(check_pattern, "").length !== 0){
										testChar = lastRubyStr.substring(0, i + 1).toKatakanaCase();
										break;
									}
									--i;
								} while (i > -1);

								let str1 = rubyEditStr.substring(0, testChar.length);
								let str2 = testChar.substring(0, rubyEditStr.length);
								if ( str1.match(dakuten_pattern) === str2.match(dakuten_pattern)
									&& str1 !== str2 ) {
									// かな英数字記号の混ぜ書き変換は無視する（＊かな入力における濁点半濁点入力の対応を追加）
									return;
								}
							}
						}

						lastRubyStr = (rubyStr.length > 0 ? rubyStr : lastRubyStr.substring(0, lastRubyStr.length - 1));
					}, 0);
				} else {
					if (ff_msimeFlag) {
						if (selectText !== rubyStr) {
							ff_msimeFlag = false;
						}
					}
					// IEでは変換キーを押下後にEnter以外でIMEが確定した場合、compositionendイベントが発火しないので救済する
					if (isIE || isEdge) {
						const nowText = elKanji.value;
						if (nowText.substring(0, orgText.length) === orgText) {
							const nowInput = nowText.substring(orgText.length, nowText.length - orgText.length);
							if (nowInput !== orgInput) {
								// 現在のテキストから入力開始前のテキストを削除した結果が現在入力中のテキストと一致しない場合は確定されたと判定
								addRuby(lastRubyStr);
								orgText = elKanji.value.substring(0, elKanji.value.length - 1);
								msimeFlag = false;
								ieSaveFlag = true;
							}
						}
					}

					if (!ieSaveFlag && lastRubyCheckStr.length > 0 && rubyStr.length > 0 && rubyCheckStr.length === 0) {
						// かな→英数字記号変換は無視する
						return;
					}

					if (elKanji.selectionStart == elKanji.value.length) {
						let rubyEditStrLastChar = rubyEditStr.charAt(rubyEditStr.length - 1).replace(check_pattern, "");
						if (rubyEditStrLastChar.length !== 0) {
							let testChar = "";
							let i = lastRubyStr.length - 1;
							do {
								if (lastRubyStr.charAt(i).toKatakanaCase().replace(check_pattern, "").length !== 0){
									testChar = lastRubyStr.substring(0, i + 1).toKatakanaCase();
									break;
								}
								i--;
							} while (i > -1);

							let str1 = rubyEditStr.substring(0, testChar.length);
							let str2 = testChar.substring(0, rubyEditStr.length);
							if ( str1.match(dakuten_pattern) === str2.match(dakuten_pattern)
								&& str1 !== str2 ) {
								// かな英数字記号の混ぜ書き変換は無視する（＊かな入力における濁点半濁点入力の対応を追加）
								return;
							}
						}
					}

					if (ff_msimeFlag) {
						lastRubyStr = "";
					} else {
						if (rubyStr.length > 0) {
							lastRubyStr = rubyStr;
						}
					}
					ff_msimeFlag = false;
				}

			} else {
				// MS-IMEの場合、IME変換後にBSキーで変換した文字を削除出来るので正しくルビを取得出来ない
				if (lastOrgInput.length - orgInput.length === 1) {
					if (lastOrgInput.substring(0, orgInput.length) === orgInput) {
						elKanji.dataset.notSupport = 1;
					}
				}
			}
			lastOrgInput = orgInput;

			if (ieSaveFlag) {
				checkPatternM(orgInput, lastRubyStr);
			}
		});

		elKanji.addEventListener("compositionend", function (e) {
			var orgInput = e.data;
			var nowText = elKanji.value;
			beforeCommitStr = "";

			// IEとMS-IMEの組み合わせで次のケースの場合、e.originalEvent.dataには何も入って来ないので救済する
			// 1.文字列を入力し確定前にBSキーで1文字以上を削除した状態で変換せずに確定した場合
			// 2.特定の文字列で文節変換をした場合(やまざき→変換→山崎→文節変換→山咲き→文節変換→山咲)
			var ie_msime = false;
			if ((isIE || isEdge) && orgInput.length === 0 && lastRubyStr.length > 0 && nowText !== orgText) {
				ie_msime = true;
			}

			if (orgInput.length > 0 || msimeFlag || ie_msime) {
				addRuby(lastRubyStr);
				beforeCommitStr = lastRubyStr;
				msimeFlag = false;
				checkPatternM(orgInput, lastRubyStr);
				lastRubyStr = ""; // Safari 5.1.7は全角SP入力でcompositionendイベントのみ発生するのでクリアしておく
			}

			if (isIE || isEdge) {
				// IEとEdgeは全角SPの入力でcompositionupdateが発生しないので、ここで救済する
				if (orgText.length < nowText.length) {
					if (nowText.substring(0, orgText.length) === orgText) {
						var work = nowText.substring(orgText.length, nowText.length - orgText.length);
						if (work === "　") {
							elKana.value = elKana.value + work;
						}
					}
				}
			}
		});

		//カナ欄をリセット（消去）する
		function resetEmptyKana() {
			//空欄にもどされたらカナもリセットに
			defaultText = '';
			orgText = '';
			elKana.value = '';
		}

		// ルビを追加する
		function addRuby(target) {
			const value = settings.katakana ? target.toKatakanaCase() : target.toHiraganaCase();
			
			// 文字列の最後がｎで終わってる場合、んに変換する : origin function appendN
			var result = value;
			if (value.toKatakanaCase().replace(check_pattern, "").replace("　", "").length > 0) {
				if (value.substring(value.length - 1).replace(n_pattern, "").length === 0) {
					result = value.substring(0, value.length - 1) + ( settings.katakana ? "ン" : "ん" );
				}
			}
			elKana.value = elKana.value + result.replace(check_pattern, "");
			settings.addRubyCallback(result);
		}

		// MS-IMEで入力途中にタイプミスでmを入力した後に変換するとmがnとして扱われるためエラーフラグを立てる
		// (例)かせmじき → 河川敷
		function checkPatternM(kanji, ruby) {
			if (kanji.replace(m_pattern, "").length === 0 && ruby.replace(m_pattern, "").length > 0) {
				elKanji.dataset.notSupport = 1;
			}
		}

	};
	//autoKana2をautoKanaにも定義(旧autoKana互換)
	window.autoKana = window.autoKana2;
})(window, document);

//　平仮名を片仮名へ変換する (＊濁点、半濁点を含む)
String.prototype.toKatakanaCase = function () {
	return this.replace(/[\u3041-\u3096\u3099-\u309E\u30F4\u309A]/g, function (match) {//origin /[\u3041-\u3096]/g
		const value = match.charCodeAt(0);
		return String.fromCharCode(value + (value < 0x3099 ? 0x60 : 0x62));
	});
};

//　片仮名を平仮名へ変換する (＊濁点、半濁点を含む)
String.prototype.toHiraganaCase = function () {
	return this.replace(/[\u30a1-\u30f6\u3099-\u309E\u30F4\u309A]/g, function (match) {//origin /[\u30a1-\u30f6]/g
		const value = match.charCodeAt(0);
		return String.fromCharCode(value - (value >= 0x30FD ? 0x60 : 0x5F));
	});
};

// JIS X0201の文字をJIS X0208に変換する
String.prototype.toWideCase = function () {
	var i, f, c, c2, a = [], m = String.prototype.toWideCase.MAPPING;
	for (i = 0, f = this.length; i < f;) {
		c = this.charCodeAt(i++);
		c2 = this.charCodeAt(i);
		switch (true) {
			case ((0x21 <= c && c <= 0x7E) && !(c == 0x22 || c == 0x27 || c == 0x5C)):
				// 英数字および一部の記号('"\は除外)
				a.push((c + 0xFEE0));
				break;
			case (c == 0xFF73):
				if (c2 == 0xFF9E) {
					// ｳﾞの場合
					a.push(0x30F4);
					i++;
					break;
				}
			case (0xFF76 <= c && c <= 0xFF86):
				if (c2 == 0xFF9E) {
					// ｶ行からﾀ行の濁音の場合
					a.push(m[c] + 0x1);
					i++;
					break;
				}
			case (0xFF8A <= c && c <= 0xFF8E):
				if (c2 == 0xFF9E || c2 == 0xFF9F) {
					// ﾊ行の濁音、半濁音の場合
					a.push(m[c] + (c2 - 0xFF9D));
					i++;
					break;
				}
			case (c in m):
				// 上記以外の半角カタカナと一部の記号
				a.push(m[c]);
				break;
			default:
				// その他の文字
				a.push(c);
				break;
		}
	}
	return String.fromCharCode.apply(null, a);
};
String.prototype.toWideCase.MAPPING = {
	0x5C: 0xFFE5,
	0x2D: 0x2015,
	0x27: 0x2019,
	0x22: 0x201D,
	0x20: 0x3000,
	0xFF64: 0x3001,
	0xFF61: 0x3002,
	0xFF62: 0x300C,
	0xFF63: 0x300D,
	0xFF9E: 0x309B,
	0xFF9F: 0x309C,
	0xFF67: 0x30A1,
	0xFF71: 0x30A2,
	0xFF68: 0x30A3,
	0xFF72: 0x30A4,
	0xFF69: 0x30A5,
	0xFF73: 0x30A6,
	0xFF6A: 0x30A7,
	0xFF74: 0x30A8,
	0xFF6B: 0x30A9,
	0xFF75: 0x30AA,
	0xFF76: 0x30AB,
	0xFF77: 0x30AD,
	0xFF78: 0x30AF,
	0xFF79: 0x30B1,
	0xFF7A: 0x30B3,
	0xFF7B: 0x30B5,
	0xFF7C: 0x30B7,
	0xFF7D: 0x30B9,
	0xFF7E: 0x30BB,
	0xFF7F: 0x30BD,
	0xFF80: 0x30BF,
	0xFF81: 0x30C1,
	0xFF6F: 0x30C3,
	0xFF82: 0x30C4,
	0xFF83: 0x30C6,
	0xFF84: 0x30C8,
	0xFF85: 0x30CA,
	0xFF86: 0x30CB,
	0xFF87: 0x30CC,
	0xFF88: 0x30CD,
	0xFF89: 0x30CE,
	0xFF8A: 0x30CF,
	0xFF8B: 0x30D2,
	0xFF8C: 0x30D5,
	0xFF8D: 0x30D8,
	0xFF8E: 0x30DB,
	0xFF8F: 0x30DE,
	0xFF90: 0x30DF,
	0xFF91: 0x30E0,
	0xFF92: 0x30E1,
	0xFF93: 0x30E2,
	0xFF6C: 0x30E3,
	0xFF94: 0x30E4,
	0xFF6D: 0x30E5,
	0xFF95: 0x30E6,
	0xFF6E: 0x30E7,
	0xFF96: 0x30E8,
	0xFF97: 0x30E9,
	0xFF98: 0x30EA,
	0xFF99: 0x30EB,
	0xFF9A: 0x30EC,
	0xFF9B: 0x30ED,
	0xFF9C: 0x30EF,
	0xFF66: 0x30F2,
	0xFF9D: 0x30F3,
	0xFF65: 0x30FB,
	0xFF70: 0x30FC
};
