/*!
 * jquery.jsontpl - client side template engine powered by jQuery
 *
 * @requires jQuery version 1.5 or higher
 * @version 0.0.5
 */
(function ($) {
    
    $.jsontpl = $.subclass();
    
    /**
     * プラグイン開発用のデバッグコンソール
     */
    var console = {
        log : (window.console) ? window.console.log : function () {}
    };
    
    /**
     * デフォルトパラメータ
     */
    $.jsontpl.params = {
        classPrefix : 'jsontpl',
        __trailing__: null
    };
    
    /**
     * デフォルトパラメータをオーバーライド
     *
     * @param obj {object}
     * @returns {jQuery.jsontpl}
     */
    $.jsontpl.setParams = function (params) {
        $.extend($.jsontpl.params, params);
        return this;
    };
    
    /**
     * Ajaxキャッシュ{url : data}
     */
    var cache = {};
    
    /**
     * キャッシュ機構を追加したajaxメソッド
     * 
     * @param params {object}
     * @returns {XMLHttpRequest | empty object}
     */
    $.jsontpl.ajax = function (params) {
        if (cache[params.url]) {
            params.success(cache[params.url]);
            return {};
        }
        params.success = (function() {
            var url = params.url;
            var orgSuccess = params.success;
            return function(a) {
                cache[url] = a;
                orgSuccess(a);
            }
        })();
        return $.ajax(params);
    };
    
    /**
     * テンプレート取得用のAjaxラッパーメソッド
     * 
     * @param url {string}
     * @returns {jQuery.jsontpl}
     */
    $.jsontpl.getTpl = function (url) {
        var ret;
        $.jsontpl.ajax({
            type: "GET",
            url: url,
            cache: true,
            async: false,
            error: function (error) {
                console.log(error.statusText + " at " + url);
            },
            success: function (tpl) {
                ret = $.jsontpl(tpl);
                
                // for msie
                if ($.browser.msie) {
                    var regexp = /<script[^>]+?>((?:.|\r|\n|\s)+?)<\/script>/mg;
                    var inner = [];
                    tpl.replace(regexp, function (match) {
                        var b = match;
                        b.match(/<script[^>]+?>((?:.|\r|\n|\s)+?)<\/script>/mg);
                        inner.push(RegExp.$1);
                        return match;
                    });
                    ret.data('jsontpl', {'js':inner});
                }
            }
        });
        return ret;
    };

    /**
     * JSON取得用のAjaxラッパーメソッド
     * 
     * @param url {string}
     * @returns {jQuery.jsontpl}
     */
    $.jsontpl.getJSON = function (url) {
        var ret;
        $.jsontpl.ajax({
            type: "GET",
            url: url,
            cache: true,
            async: false,
            dataType: 'json',
            error: function (error) {
                console.log(error.statusText + " at " + url);
            },
            success: function (json) {
                ret = json;
            }
        });
        return ret;
    };
    
    /**
     * テンプレートとJSONの取得用のAjaxラッパーメソッド
     *
     * @param tpl {string} テンプレートファイル名
     * @param json {string} JSONファイル名
     * @returns {jQuery.jsontpl} テンプレートとJSON
     */
    $.jsontpl.get = function (tpl, json) {
        return {
            tpl  : $.jsontpl.getTpl(tpl),
            json : $.jsontpl.getJSON(json)
        };
    };
    
    /**
     * テンプレート内のコンテキストを保持
     */
    var context;
    
    /**
     * テンプレートから現在のコンテキストを取得するAPI
     * @returns jQueryエレメント
     */
    var getContext = $.jsontpl.getContext = function () {
        return context || $('body');
    }
    
    /**
     * テンプレート内から現在のコンテキストでの変数を取得するAPI
     * @param name {string} 変数名
     * @returns 値
     */
    $.jsontpl.fn.getvar = function (name) {
        return this.data('jsontpl')['var'][name];
    }
    
    $.jsontpl.fn.extendData = function (obj) {
        var a = this.data('jsontpl');
        a = $.extend(a, obj);
        this.data('jsontpl', a);
    }
    
    /**
     * テンプレートパース
     *
     * @param tpl {jQuery element | string} jQueryエレメントまたはファイル名
     * @param json {object | string} JSONオブジェクトまたはファイル名
     * @returns {jQuery element}
     */
    var _parse =  function (tpl, json) {
        if (typeof tpl === 'string') {
            tpl = $.jsontpl.getTpl(tpl);
        }
        if (typeof json === 'string') {
            json = $.jsontpl.getJSON(json);
        } else if ((json && json.constructor !== Array)) {
            json = [json];
        }
        
        var ret = $.jsontpl('<div />');
        
        for (var idx in json) {
            var data = json[idx];
            var tpl_tmp = $.jsontpl("<div />");
            tpl_tmp.data("jsontpl", {'var':data});
            var current_context = context;
            context = tpl_tmp;
            tpl_tmp.html(tpl.clone());
            for (var tplvar in data) {
                tpl_tmp.find("[name=" + tplvar + "]").replaceWith(data[tplvar]);
            }
            if ($.browser.msie) {
                var jsArray = tpl.data('jsontpl');
                var script = document.createElement("script");
                script.type = "text/javascript";
                for (var a in jsArray) {
                    script.text = jsArray[a];
                }
                tpl_tmp.get(0).appendChild(script);
            }
            ret.append(tpl_tmp.children());
            context = current_context;
        }
        ret.find("[id]").removeAttr("id");
        return ret.children();
    };
    
    /**
     * テンプレートパースAPI
     *
     * @param tpl {jQuery element | string} jQuery element or filename
     * @param json {object | string} object or filename
     * @returns {jQuery element}
     */
    $.jsontpl.parse = _parse;
    
    /**
     * テンプレートパースAPI
     *
     * @param json {object | string} object or filename
     * @returns {jQuery.jsontpl element}
     */
    $.jsontpl.fn.parse = function (json) {
        return _parse(this, json);
    };
    
    $.jsontpl.fn.appendTo = function (selector) {
        getContext().find(selector).append(this);
        return this;
    };
    $.jsontpl.fn.prependTo = function (selector) {
        getContext().find(selector).prepend(this);
        return this;
    };
    $.jsontpl.fn.insertBefore = function (selector) {
        getContext().find(selector).before(this);
        return this;
    };
    $.jsontpl.fn.insertAfter = function (selector) {
        getContext().find(selector).after(this);
        return this;
    };
    
})(jQuery);
