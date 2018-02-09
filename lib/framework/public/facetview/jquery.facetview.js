/* eslint-disable no-unused-vars,no-constant-condition,no-redeclare,no-undef,no-inner-declarations */
/*global $, jQuery, eea_mapping, fn_settings, distance_shape, center_changed_event, bounds_shape */
/* jshint -W004 */
/*
 * jquery.facetview.js
 *
 * displays faceted browse results by querying a specified elasticsearch index
 * can read config locally or can be passed in as variable when executed
 * or a config variable can point to a remote config
 *
 * created by Mark MacGillivray - mark@cottagelabs.com
 *
 * http://cottagelabs.com
 *
 * There is an explanation of the options below.
 *
 */

// #82166 polyfil needed for IE as it misses startsWith
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, position) {
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
  };
}

(function(e){function f(a,c){function b(a){if(!this||this.constructor!==b)return new b(a);this._keys=[];this._values=[];this._itp=[];this.objectOnly=c;a&&v.call(this,a)}c||w(a,"size",{get:x});a.constructor=b;b.prototype=a;return b}function v(a){this.add?a.forEach(this.add,this):a.forEach(function(a){this.set(a[0],a[1])},this)}function d(a){this.has(a)&&(this._keys.splice(b,1),this._values.splice(b,1),this._itp.forEach(function(a){b<a[0]&&a[0]--}));return-1<b}function m(a){return this.has(a)?this._values[b]:
    void 0}function n(a,c){if(this.objectOnly&&c!==Object(c))throw new TypeError("Invalid value used as weak collection key");if(c!=c||0===c)for(b=a.length;b--&&!y(a[b],c););else b=a.indexOf(c);return-1<b}function p(a){return n.call(this,this._values,a)}function q(a){return n.call(this,this._keys,a)}function r(a,c){this.has(a)?this._values[b]=c:this._values[this._keys.push(a)-1]=c;return this}function t(a){this.has(a)||this._values.push(a);return this}function h(){(this._keys||0).length=this._values.length=
    0}function z(){return k(this._itp,this._keys)}function l(){return k(this._itp,this._values)}function A(){return k(this._itp,this._keys,this._values)}function B(){return k(this._itp,this._values,this._values)}function k(a,c,b){var g=[0],e=!1;a.push(g);return{next:function(){var f,d=g[0];!e&&d<c.length?(f=b?[c[d],b[d]]:c[d],g[0]++):(e=!0,a.splice(a.indexOf(g),1));return{done:e,value:f}}}}function x(){return this._values.length}function u(a,c){for(var b=this.entries();;){var d=b.next();if(d.done)break;
    a.call(c,d.value[1],d.value[0],this)}}var b,w=Object.defineProperty,y=function(a,b){return isNaN(a)?isNaN(b):a===b};"undefined"==typeof WeakMap&&(e.WeakMap=f({"delete":d,clear:h,get:m,has:q,set:r},!0));"undefined"!=typeof Map&&"function"===typeof(new Map).values&&(new Map).values().next||(e.Map=f({"delete":d,has:q,get:m,set:r,keys:z,values:l,entries:A,forEach:u,clear:h}));"undefined"!=typeof Set&&"function"===typeof(new Set).values&&(new Set).values().next||(e.Set=f({has:p,add:t,"delete":d,clear:h,
    keys:l,values:l,entries:B,forEach:u}));"undefined"==typeof WeakSet&&(e.WeakSet=f({"delete":d,add:t,clear:h,has:p},!0))})("undefined"!=typeof exports&&"undefined"!=typeof global?global:window);



// IE11 has an incomplete implementation of Set which doesn't allow you to iterate the keys
// so this code assumes you want a full implementation and will redefine Set if the half
// implementation is present

/*if (typeof Set === "undefined" || typeof Set.prototype.keys !== "function") {
    var Set = (function() {
        "use strict";

        var iterables = {
            "[object Array]": true,
            "[object Arguments]": true,
            "[object HTMLCollection]": true,
            "[object NodeList]": true
        };

        // shortcuts
        var hasOwn = Object.prototype.hasOwnProperty;
        var toString = Object.prototype.toString;

        function hasOwnProp(obj, prop) {
            return hasOwn.call(obj, prop);
        }

        function isIterable(item) {
            // for purposes of this implementation, an iterable is anything we can iterate with
            // a classic for loop:
            //     for (var i = 0; i < item.length; i++)
            // Currently accepts: array, arguments object, HTMLCollection, NodeList
            // and anything that has a .length with a numeric value and, if .length > 0, the first item has a nodeType property
            var name;
            if (typeof item === "object") {
                name = toString.call(item);
                return ((iterables[name] === true) ||
                    (typeof item.length === "number" &&
                        item.length >= 0 &&
                        (item.length === 0 || (typeof item[0] === "object" && item[0].nodeType > 0))
                    )
                );
            }
            return false;
        }

        // decide if we can use Object.defineProperty
        // include a test for Object.defineProperties (which IE8 does not have) to eliminate
        // using the broken Object.defineProperty in IE8
        var canDefineProperty = Object.defineProperty && Object.defineProperties;

        function setProperty(obj, propName, value, enumerable, writable) {
            if (canDefineProperty) {
                Object.defineProperty(obj, propName, {
                    enumerable: enumerable,
                    configurable: false,
                    writable: writable,
                    value: value
                });
            } else {
                obj[propName] = value;
            }
        }

        // this private function is used like a private method for setting
        // the .size property.  It cannot be called from outside this closure.
        var settable = false;
        function setSize(obj, val) {
            settable = true;
            obj.size = val;
            settable = false;
        }

        // this is the constructor function which will be returned
        // from this closure
        function SetConstructor(arg) {
            // private member variable, not used if IE8
            var size = 0;

            // set properties in cross-browser way
            setProperty(this, "baseType", "Set", false, false);   // not enumerable, not writeable
            setProperty(this, "_data", {}, false, true);          // not enumerable, writeable
            if (canDefineProperty) {
                Object.defineProperty(this, "size", {
                    enumerable: true,
                    configurable: false,
                    get: function() { return size;},
                    set: function(val) {
                        if (!settable) {throw new Error("Can't set size property on Set object.")}
                        size = val;
                    }
                });
            } else {
                // .size is just regular property in IE8
                this.size = 0;
            }
            // now add initial data
            // per spec make sure it isn't undefined or null
            if (arg !== undefined && arg !== null) {
                if (isIterable(arg)) {
                    for (var i = 0; i < arg.length; i++) {
                        this.add(arg[i]);
                    }
                    // also check our own custom property in case
                    // there is cross window code that won't pass instanceof
                } else if (arg instanceof Set || arg.baseType === "Set") {
                    arg.forEach(function(item) {
                        this.add(item);
                    }, this);
                }
            }
        }

        // state variables and shared constants
        var objectCntr = 0;
        var objectCntrBase = "obj_";
        var objectCntrProp = "__objectPolyFillID";

        // types where we just use the first 3 letters of the type
        // plus underscore + toString() to make the key
        // The first 3 letters of the type makes a namespace for each
        // type so we can have things like 0 and "0" as separate keys
        // "num_0" and "str_0".
        var autoTypes = {
            "string": true,
            "boolean": true,
            "number": true,
            "undefined": true
        };

        function getKey(val, putKeyOnObject) {
            // manufacture a namespaced key
            var type = typeof val, id;
            if (autoTypes[type]) {
                return type.substr(0, 3) + "_" + val;
            } else if (val === null) {
                return "nul_null";
            } else if (type === "object" || type === "function") {
                // coin a unique id for each object and store it on the object
                if (val[objectCntrProp]) {
                    return val[objectCntrProp];
                } else if (!putKeyOnObject) {
                    // it only returns null if there is no key already on the object
                    // and it wasn't requested to create a new key on the object
                    return null;
                } else {
                    // coin a unique id for the object
                    id = objectCntrBase + objectCntr++;
                    // include a test for Object.defineProperties to rule out IE8
                    // which can't use Object.defineProperty on normal JS objects
                    if (toString.call(val) === "[object Object]" && canDefineProperty) {
                        Object.defineProperty(val, objectCntrProp, {
                            enumerable: false,
                            configurable: false,
                            writable: false,
                            value: id
                        });
                    } else {
                        // no Object.defineProperty() or not plain object, so just assign property directly
                        val[objectCntrProp] = id;
                    }
                    return id;
                }
            } else {
                throw new Error("Unsupported type for Set.add()");
            }
        }

        function SetIterator(keys, data, format) {
            var index = 0, len = keys.length;
            this.next = function() {
                var val, result = {}, key;
                while (true) {
                    if (index < len) {
                        result.done = false;
                        key = keys[index++];
                        val = data[key];
                        // check to see if key might have been removed
                        // undefined is a valid value in the set so we have to check more than that
                        // if it is no longer in the set, get the next key
                        if (val === undefined && !hasOwnProp(data, key)) {
                            continue;
                        }
                        if (format === "keys") {
                            result.value = val;
                        } else if (format === "entries") {
                            result.value = [val, val];
                        }
                    } else {
                        // clear references to outside data
                        keys = null;
                        data = null;
                        result.done = true;
                    }
                    return result;
                }
            };
        }

        function getKeys(data) {
            var keys = [];
            for (var prop in data) {
                if (hasOwnProp(data, prop)) {
                    keys.push(prop);
                }
            }
            return keys;
        }

        SetConstructor.prototype = {
            add: function(val) {
                var key = getKey(val, true);
                if (!hasOwnProp(this._data, key)) {
                    this._data[key] = val;
                    setSize(this, this.size + 1);
                }
                return this;
            },
            clear: function() {
                this._data = {};
                setSize(this, 0);
            },
            // delete has to be in quotes for IE8 - go figure
            "delete": function(val) {
                var key = getKey(val, false);
                if (key !== null && hasOwnProp(this._data, key)) {
                    delete this._data[key];
                    setSize(this, this.size - 1);
                    return true;
                }
                return false;
            },
            // .remove() is non-standard, but here for anyone who wants to use it
            // so that you can use this polyfill all the way down to IE7 and IE8
            // since IE8 can't use a method named .delete()
            remove: function(val) {
                return this["delete"](val);
            },
            forEach: function(fn /!*, context *!/) {
                // by spec, we have to type check the fn argument
                if (typeof fn !== "function") return;

                // context argument is optional, but .forEach.length is supposed to be 1 by spec
                // so we declare it this way
                var context = arguments[1];

                // forEach specifies that the iteration set is
                // determined before the first callback so we get all the
                // keys first
                var iter = this.keys(), next, item;
                while ((next = iter.next()) && !next.done) {
                    item = next.value;
                    fn.call(context, item, item, this);
                }
            },
            has: function(val) {
                var key = getKey(val, false);
                if (key === null) return false;
                return hasOwn.call(this._data, key);
            },
            values: function() {
                return this.keys();
            },
            keys: function() {
                return new SetIterator(getKeys(this._data), this._data, "keys");
            },
            entries: function() {
                return new SetIterator(getKeys(this._data), this._data, "entries");
            }
        };

        SetConstructor.prototype.constructor = SetConstructor;

        return SetConstructor;
    })();
}*/

// polyfil for Object.keys
if (!Object.keys) Object.keys = function(o) {
    if (o !== Object(o))
        throw new TypeError('Object.keys called on a non-object');
    var k=[],p;
    for (p in o) if (Object.prototype.hasOwnProperty.call(o,p)) k.push(p);
    return k;
}

// https://tc39.github.io/ecma262/#sec-array.prototype.findIndex
if (!Array.prototype.findIndex) {
        Object.defineProperty(Array.prototype, 'findIndex', {
            value: function(predicate) {
                // 1. Let O be ? ToObject(this value).
                if (this == null) {
                    throw new TypeError('"this" is null or not defined');
                }

                var o = Object(this);

                // 2. Let len be ? ToLength(? Get(O, "length")).
                var len = o.length >>> 0;

                // 3. If IsCallable(predicate) is false, throw a TypeError exception.
                if (typeof predicate !== 'function') {
                    throw new TypeError('predicate must be a function');
                }

                // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
                var thisArg = arguments[1];

                // 5. Let k be 0.
                var k = 0;

                // 6. Repeat, while k < len
                while (k < len) {
                    // a. Let Pk be ! ToString(k).
                    // b. Let kValue be ? Get(O, Pk).
                    // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
                    // d. If testResult is true, return k.
                    var kValue = o[k];
                    if (predicate.call(thisArg, kValue, k, o)) {
                        return k;
                    }
                    // e. Increase k by 1.
                    k++;
                }

                // 7. Return -1.
                return -1;
            }
        });
    }

//polyfill for Array.reduce()
// Production steps of ECMA-262, Edition 5, 15.4.4.21
// Reference: http://es5.github.io/#x15.4.4.21
// https://tc39.github.io/ecma262/#sec-array.prototype.reduce
if (!Array.prototype.reduce) {
        Object.defineProperty(Array.prototype, 'reduce', {
            value: function(callback /*, initialValue*/) {
                if (this === null) {
                    throw new TypeError( 'Array.prototype.reduce ' +
                        'called on null or undefined' );
                }
                if (typeof callback !== 'function') {
                    throw new TypeError( callback +
                        ' is not a function');
                }

                // 1. Let O be ? ToObject(this value).
                var o = Object(this);

                // 2. Let len be ? ToLength(? Get(O, "length")).
                var len = o.length >>> 0;

                // Steps 3, 4, 5, 6, 7
                var k = 0;
                var value;

                if (arguments.length >= 2) {
                    value = arguments[1];
                } else {
                    while (k < len && !(k in o)) {
                        k++;
                    }

                    // 3. If len is 0 and initialValue is not present,
                    //    throw a TypeError exception.
                    if (k >= len) {
                        throw new TypeError( 'Reduce of empty array ' +
                            'with no initial value' );
                    }
                    value = o[k++];
                }

                // 8. Repeat, while k < len
                while (k < len) {
                    // a. Let Pk be ! ToString(k).
                    // b. Let kPresent be ? HasProperty(O, Pk).
                    // c. If kPresent is true, then
                    //    i.  Let kValue be ? Get(O, Pk).
                    //    ii. Let accumulator be ? Call(
                    //          callbackfn, undefined,
                    //          « accumulator, kValue, k, O »).
                    if (k in o) {
                        value = callback(value, o[k], k, o);
                    }

                    // d. Increase k by 1.
                    k++;
                }

                // 9. Return accumulator.
                return value;
            }
        });
    }


function uniqueArray(arr) {
    var a = [];
    for (var i=0, l=arr.length; i<l; i++)
        if (a.indexOf(arr[i]) === -1 && arr[i] !== '')
            a.push(arr[i]);
    return a;
}


function DoubleScroll(element) {
    if ($(".abovescrollbar").length) {
        return;
    }
    var $facetview_results = $("#facetview_results");
    var scrollbar = document.createElement('div');
    scrollbar.className = "abovescrollbar";
    scrollbar.appendChild(document.createElement('div'));
    var child = scrollbar.firstChild;
    try {
        child.style.width = $facetview_results[0].scrollWidth + 'px';
        child.className = "eea-scrollbar";
    }
    catch (err)
    {}
    child.appendChild(document.createTextNode('\xA0'));

    var $scrollbar = $(scrollbar);
    $scrollbar.bindWithDelay("scroll", function(){
        $facetview_results.scrollLeft($scrollbar.scrollLeft());
    }, 50);
    $facetview_results.bindWithDelay("scroll", function(){
        $scrollbar.scrollLeft($facetview_results.scrollLeft());
    }, 50);
    element.insertBefore(scrollbar, element.firstChild);
}

function checkLandingPage(options) {
    var facets = eea_mapping.facets;
    var remove_landing = options && options.remove_landing || false;
    var isLanding = !remove_landing;
    if (!remove_landing) {
        if ($('.facetview_filterselected').filter(':visible').length > 1) {
                isLanding = false;
        }
    }
    if ($(".facetedview_search").find("input").attr("value").length > 0){
        isLanding = false;
    }

    if (isLanding){
        $(".current-filters").hide();
        $(".facetview_top").hide();
        $("#facetview_results_wrapper").hide();
        $(".facetview_metadata").hide();
        $(".no-results-message").hide();
        var $landing = $("#landing");
        $landing.insertAfter(".facetedview_search");
        $landing.show();
    }
    else {
        $(".current-filters").show();
        $(".facetview_top").show();
        $("#facetview_results_wrapper").show();
        $(".facetview_metadata").show();
        $("#landing").hide();
    }
}


(function($) {
    $.fn.bindWithDelay = function(type, data, fn, timeout, throttle) {
        var wait = null;
        var that = this;

        if ($.isFunction(data)) {
            throttle = timeout;
            timeout = fn;
            fn = data;
            data = undefined;
        }

        function cb() {
            var e = $.extend(true, { }, arguments[0]);
            var throttler = function() {
                wait = null;
                fn.apply(that, [e]);
            };

            if (!throttle) { clearTimeout(wait); }
            if (!throttle || !wait) { wait = setTimeout(throttler, timeout); }
        }

        return this.bind(type, data, cb);
    };
})(jQuery);

//get value by name from sessionStorage
function getValueFromSessionStorage (cookieName) {
    return sessionStorage[cookieName] ? sessionStorage[cookieName] : '';
}

//set a sessionStorage value
function setValueInSessionStorage(name, value) {
    sessionStorage[name] = value;
}


function findObjectByKey(obj, key){
    var found_obj;
    if (typeof(obj) === 'object'){
        jQuery.each(obj, function(obj_key, obj_val){
            if (obj_key === key){
                found_obj = obj_val;
            }
            if (found_obj === undefined){
                found_obj = findObjectByKey(obj_val, key);
            }
        });
    }
    return found_obj;
}

// custom url setter and getter

function customGetUrl(options){
    if (options.customGetUrl){
        return options.customGetUrl(options);
    }
    else {
        return window.location.href;
    }
}

function customSetUrl(options, stateObj, page, url){
    if (options.customSetUrl){
        return options.customSetUrl(stateObj, page, url);
    }
    else {
        return window.history.pushState(stateObj, page, url);
    }
}

// add extension to jQuery with a function to get URL parameters
jQuery.extend({
    getUrlVars: function(options) {
        var newval;
        var params = {};
        var location_href = customGetUrl(options);
        var hashes = location_href.slice(location_href.indexOf('?') + 1).split('&');
        var hash;
        var unescape = window.decodeURI;
        for (var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            if (hash.length > 1) {
                hash[1] = decodeURIComponent(hash[1]);
                if (hash[1].replace(/%22/gi, '')[0] === '[' ||
                    hash[1].replace(/%22/gi, '')[0] === '{') {
                    hash[1] = hash[1].replace(/^%22/, '').replace(/%22$/, '');
                    newval = JSON.parse(
                        unescape(hash[1].replace(/%22/gi, '"')));
                } else {
                    newval = unescape(hash[1].replace(/%22/gi, '"'));
                }
                params[hash[0]] = newval;
            }
        }
        var query_string = findObjectByKey(params, "query_string");
        if (query_string !== undefined){
            var query = findObjectByKey(query_string, "query");
            if (query !== undefined){
                params.q = query;
            }
        }
        if ((params.source !== undefined) && (params.source.sort !== undefined)){
            setValueInSessionStorage('order', JSON.stringify(params.source.sort), 365);
        }
        return params;
    },
    getUrlVar: function(options, name) {
        return jQuery.getUrlVars(options)[name];
    }
});


// Deal with indexOf issue in <IE9
// provided by commentary in repo issue -
//https://github.com/okfn/facetview/issues/18
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement /*, fromIndex */) {
        'use strict';
        if (this === null) {
            throw new TypeError();
        }
        var t = Object(this);
        var len = t.length || 0;
        if (len === 0) {
            return -1;
        }
        var n = 0;
        if (arguments.length > 1) {
            n = Number(arguments[1]);
            if (n !== n) { // shortcut for verifying if it's NaN
                n = 0;
            } else if (n !== 0 && n !== Infinity && n !== -Infinity) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
        }
        if (n >= len) {
            return -1;
        }
        var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
        for (; k < len; k++) {
            if (k in t && t[k] === searchElement) {
                return k;
            }
        }
        return -1;
    };
}

/* EXPLAINING THE FACETVIEW OPTIONS

Facetview options can be set on instantiation. The list below details which
options are available.

Options can also be set and retrieved externally via $.fn.facetview.options.

Query values can also be read from the query parameters of the current page, or
provided in
the "source" option for initial search.

Also, whilst facetview is executing a query, it will "show" any element with
the "notify-loading" class.
So that class can be applied to any element on a page that can be used to
signify loading is taking place.

Once facetview has executed a query, the querystring used is available under
"options.querystring".
And the result object as retrieved directly from the index is available under
"options.rawdata".

searchbox_class
---------------
This should only be set if embedded_search is set to false, and if an
alternative search box on the page should be used as the source of search
terms. If so, this should be set to the class name (including preceding .)
of the text input that should be used as the source of the search terms.
It is only a class instead of an ID so that it can be applied to fields that
may already have an ID - it should really identify a unique box on the page for
entering search terms for this instance of facetview.
So an ID could actually also be used - just precede with # instead of .
This makes it possible to embed a search box anywhere on a page and have it be
used as the source of simple search parameters for the facetview. Only the last
text box with this clas will be used.

embedded_search
---------------
Default to true, in which case full search term functionality is created and
displayed on the page.
If this is false, the search term text box and options will be hidden, so that
new search terms cannot be provided by the user.
It is possible to set an alternative search term input box on the page instead,
by setting this to false and also setting a searchbox_class value to identify
the basic source of search terms, in which case such a box must be manually
created elsewhere on the page.

searchbox_shade
---------------
The background colour to apply to the search box

sharesave_link
--------------
Default to true, in which case the searchbox - if drawn by facetview - will be
appended with a button that shows the full current search parameters as a URL.

config_file
-----------
Specify as a URL from which to pull a JSON config file specifying these options.

facets
------
A list of facet objects which should be created as filter options on the page.
As per elasticsearch facets settings, plus "display" as a display name for the
facet, instead of field name.
If these should be nested, define them with full scope
e.g. nestedobj.nestedfield.

extra_facets
------------
An object of named extra facet objects that should be submitted and executed on
each query.
These will NOT be used to generate filters on the page, but the result object
can be queried for their content for other purposes.

searchbox_fieldselect
---------------------
A list of objects specifying fields to which search terms should be restricted.
Each object should have a "display" value for displaying as the name of the
option, and a "field" option specifying the field to restrict the search to.

search_sortby
----------------
A list of objects describing sort option dropdowns.
Each object requires a "display" value, and "field" value upon which to sort
results.
NOTE sort fields must be unique on the ES index, NOT lists. Otherwise it will
fail silently. Choose wisely.

enable_rangeselect
------------------
RANGES NEED SOME WORK AFTER RECENT UPDATE, KEEP DISABLED FOR NOW
Enable or disable the ability to select a range of filter values

include_facets_in_querystring
-----------------------------
Default to false.
Whether or not to include full facet settings in the querystring when it is
requested for display.
This makes it easier to get the querystring for other purposes, but does not
change the query that is sent to the index.

result_display
--------------
A display template for search results. It is a list of lists.
Each list specifies a line. Within each list, specify the contents of the line
using objects to describe them. Each content piece should pertain to a
particular "field" of the result set, and should specify what to show "pre" and
"post" the given field

display_images
--------------
Default to true, in which case any image found in a given result object will be
displayed to the left in the result object output.

description
-----------
Just an option to provide a human-friendly description of the functionality of
the instantiated facetview.
Like "search my shop". Will be displayed on the page.

search_url
----------console.log(options);
The URL at the index to which searches should be submitted in order to retrieve
JSON results.

datatype
--------
The datatype that should be used when submitting a search to the index - e.g.
JSON for local, JSONP for remote.

initialsearch
-------------
Default to true, in which case a search-all will be submitted to the index on
page load.
Set to false to wait for user input before issuing the first search.

fields
------
A list of which fields the index should return in result objects (by default
elasticsearch returns them all).

partial_fields
--------------
A definition of which fields to return, as per elasticsearch docs
http://www.elasticsearch.org/guide/reference/api/search/fields.html

nested
------
A list of keys for which the content should be considered nested for query and
facet purposes.
NOTE this requires that such keys be referenced with their full scope e.g.
nestedobj.nestedfield.
Only works on top-level keys so far.

default_url_params
------------------
Any query parameters that the index search URL needs by default.

freetext_submit_delay
---------------------
When search terms are typed in the search box, they are automatically submitted
to the index.
This field specifies in milliseconds how long to wait before sending another
query - e.g. waiting for the user to finish typing a word.

q
-
Specify a query value to start with when the page is loaded. Will be submitted
as the initial search value if initialsearch is enabled. Will also be set as
the value of the searchbox on page load.

predefined_filters
------------------
Facet / query values to apply to all searches. Give each one a reference key,
then in each object define it as per an elasticsearch query for appending to
the bool must.
If these filters should be applied at the nested level, then prefix the name
with the relevant nesting prefix.
e.g. if the nested object is called stats, call the filter stats.MYFILTER.

filter
-------
JSON document describing an `elasticsearch filter
<http://www.elasticsearch.org/guide/reference/api/search/filter/>`_

paging
------
An object defining the paging settings:

    from
    ----
    Which result number to start displaying results from

    size
    ----
    How many results to get and display per "page" of results

pager_on_top
------------
Default to false, in which case the pager - e.g. result count and prev / next
page buttons - only appear at the bottom of the search results.
Set to true to show the pager at the top of the search results as well.

pager_slider
------------
If this is set to true, then the paging options will be a left and right arrow
at the bottom, with the count in between, but a bit bigger and more slider-y
than the standard one. Works well for displaying featured content, for example.

sort
----
A list of objects defining how to sort the results, as per elasticsearch
sorting.

searchwrap_start
searchwrap_end
----------------
HTML values in which to wrap the full result set, to style them into the page
they are being injected into.

resultwrap_start
resultwrap_end
----------------
HTML values in which to wrap each result object

result_box_colours
------------------
A list of background colours that will be randomly assigned to each result
object that has the "result_box" class. To use this, specify the colours in
this list and ensure that the "result_display" option uses the "result_box"
class to wrap the result objects.

fadein
------
Define a fade-in delay in milliseconds so that whenever a new list of results
is displays, it uses the fade-in effect.

post_search_callback
--------------------
This can define or reference a function that will be executed any time new
search results are retrieved and presented on the page.

post_init_callback
------------------
This can define or reference a function that will be executed any time new
facetview object is being created

pushstate
---------
Updates the URL string with the current query when the user changes the search
terms

linkify
-------
Makes any URLs in the result contents into clickable links

default_operator
----------------
Sets the default operator in text search strings - elasticsearch uses OR by
default, but can also be AND

default_freetext_fuzzify
------------------------
If this exists and is not false, it should be either * or ~. If it is * then *
will be prepended and appended to each string in the freetext search term, and
if it is ~ then ~ will be appended to each string in the freetext search term.
If * or ~ or : are already in the freetext search term, it will be assumed the
user is already trying to do a complex search term so no action will be taken.
NOTE these changes are not replicated into the freetext search box - the end
user will not know they are happening.

add_undefined
-------------
Adds a new value to each set, 'undefined', coresponding to the facet response
'missing'.
For each property, 'undefined' will cover all objects that do not have a value
for it.

static_filter
-------------
A static filter with predefined values that can be included in the search.

oneorless
---------
An option for static filters saying that the user can either select a value, or
not select anything. Therefore, when a new value is selected, the previous one,
if it exists, will be disabled.

hierarchy
---------
When this exists and it is not false, it defines a controled vocabulary for the
facet values. The values are classified into categories, sub-categories... with
an unlimited number of possible children. All the categories are possible
facets but they are not obtained from the data.

permanent_filters
-----------------
When this is set to true, the main filters (the defined facet values) will
remain visible even if there is only one possible value.

facet_display_options
---------------------
When this parameter is not an empty list, it defines a list of settings for
displaying facet values.
Possible values:
    checkbox - when included, a checkbox is displayed in front of the options
    sort - when included, one can sort the facet values
The checkbox option is only possible for one layer trees

enable_wildcard_search
----------------------
When this parameter is set to true, wildcards in the query string will be
parsed.

querystr_filtered_chars
-----------------------
Add a string with the chars that should be filtered out when performing the
search. Use this when you want to escape wildcards added by the user.

no_results_message
------------------
Custom message to display when there are no results found for the search. The
default one is "Not found..."


*/

function sortNumber(a,b){
    return a-b;
}

// now the facetview function
(function($) {
    // noinspection JSLint
    // noinspection JSLint
    $.fn.facetview = function(options) {
        // a big default value (pulled into options below)
        // demonstrates how to specify an output style based on the fields that
        //can be found in the result object where a specified field is not
        //found, the pre and post for it are just ignored
        var resdisplay = [
                [
                    {
                        'field': 'author.name'
                    },
                    {
                        'pre': '(',
                        'field': 'year',
                        'post': ')'
                    }
                ],
                [
                    {
                        'pre': '<strong>',
                        'field': 'title',
                        'post': '</strong>'
                    }
                ],
                [
                    {
                        'field': 'howpublished'
                    },
                    {
                        'pre': 'in <em>',
                        'field': 'journal.name',
                        'post': '</em>,'
                    },
                    {
                        'pre': '<em>',
                        'field': 'booktitle',
                        'post': '</em>,'
                    },
                    {
                        'pre': 'vol. ',
                        'field': 'volume',
                        'post': ','
                    },
                    {
                        'pre': 'p. ',
                        'field': 'pages'
                    },
                    {
                        'field': 'publisher'
                    }
                ],
                [
                    {
                        'field': 'link.url'
                    }
                ]
            ];


        // specify the defaults
        var defaults = {
            'config_file': false,
            'embedded_search': true,
            'searchbox_class': '',
            'searchbox_fieldselect': [],
            'searchbox_shade': '#ebf3f6',
            'search_sortby': [],
            'save_link': true,
            'sharesave_link': false,
            'description': '',
            'facets': [],
            'extra_facets': {},
            'enable_rangeselect': false,
            'include_facets_in_querystring': false,
            'result_display': resdisplay,
            'display_images': true,
            'search_url': '',
            'datatype': 'jsonp',
            'initialsearch': true,
            'fields': false,
            'partial_fields': false,
            'nested': [],
            'default_url_params': {},
            'freetext_submit_delay': '1000',
            'freetext_suggest_delay': '100',
            'q': '',
            'sort': [],
            'predefined_filters': {},
            'paging': {
                'from': 0,
                'size': 10
            },
            'pager_on_top': false,
            'pager_slider': false,
            'searchwrap_start': '<table class="table table-striped ' +
                'table-bordered" id="facetview_results">',
            'searchwrap_end': '</table>',
            'resultwrap_start': '<tr><td>',
            'resultwrap_end': '</td></tr>',
            'result_box_colours': [],
            'fadein': 800,
            'post_search_callback': false,
            'post_init_callback': false,
            'pushstate': true,
            'linkify': true,
            'default_operator': 'OR',
            'default_freetext_fuzzify': false,
            'static_filters': [],
            'hierarchy': false,
            'permanent_filters': false,
            'predefined_permanent_filters': undefined,
            'query_filter': false,
            'facet_display_options' : [],
            'enable_wildcard_search' : true,
            'querystr_filtered_chars' : '',
            'no_results_message' : false,
            "default_sort":{},
            "resizable": true,
            "display_type_options": ['tabular', 'card', 'list'],
            "display_type": 'tabular',
            "highlight_enabled": false,
            "highlight_blacklist": [],
            "highlight_whitelist": [],
            "relevance": {}
        };

        if (defaults.sharesave_link) {
            $("<div>")
                .addClass("facet-share")
                .insertBefore(".facet-view-simple");

            $("<a>")
                .addClass("facetview-share")
                .text("Share this search")
                .appendTo(".facet-share");
            $("<i>")
                .addClass("share-icon")
                .prependTo(".facetview-share");
        }

        // and add in any overrides from the call
        // these options are also overridable by URL parameters
        // facetview options are declared as a function so they are available
        // externally
        // (see bottom of this file)
        var provided_options = $.extend(defaults, options);
        var url_options = $.getUrlVars(options);
        $.fn.facetview.options = $.extend(provided_options, url_options);
        var options = $.fn.facetview.options;
        options.query_type = "filtered";
        if (settings_relevance_enabled){
            options.query_type = "function_score";
        }
        // save current facet field and display name mapping
        // this is used when displaying what filter is used and which
        // category it belongs to

        if (options.facets) {
            (function(){
                var i, current, length = options.facets.length;
                options.facetnames = {};
                options.facetids = {};
                for (i = 0; i < length; i++) {
                    current = options.facets[i];
                    options.facetnames[current.field] = current.display;
                    options.facetids[current.field] = i;
                }
            }());
        }
        options.isInitialSearch = false;

        if (jQuery.isEmptyObject(url_options)){
            options.isInitialSearch = true;
        }
        options.applyingDefaults = false;
        // if hierarchy is missing create a default one
        if (!options.hierarchy) {
            options.hierarchy = {};
            for (var i = 0; i < options.facets.length; i++) {
                options.hierarchy[options.facets[i].field] = [];
            }
        }

        window.embed = url_options.embed;
        if (url_options.source) {
            var from = url_options.source.from;
            options.paging.from = !from ? options.paging.from : from;
            var size = url_options.source.size;
            options.paging.size = !size ? options.paging.size : size;
            var sort = url_options.source.sort;
            options.sort = !sort ? options.sort : sort;
            var display_type = url_options.source.display_type;

            if (($.inArray(display_type, options.display_type_options) === -1)) {
                display_type = options.display_type;
            }
            options.ignore_landing = url_options.source.ignore_landing;
            options.display_type = !display_type ? options.display_type : display_type;
        } else {
            var display_type_cookie = getValueFromSessionStorage('display_type');
            if (display_type_cookie && ($.inArray(display_type_cookie, options.display_type_options)>-1)) {
                options.display_type = display_type_cookie;
            }
        }
        var orderBy_Cookie = getValueFromSessionStorage('order');
        if (orderBy_Cookie.length > 0){
            orderBy_Cookie = JSON.parse(orderBy_Cookie);
            if (orderBy_Cookie.order === undefined){
                options.sort = orderBy_Cookie;
            }
            else {
                options.sort = [];
                options.selected_sort = 'relevance';
            }
        }

        // ===============================================
        // storage keys
        // ===============================================
        var SLIDER_KEY = "slider_";
        var GROUPS_KEY = "histogram_group_";
        var INITIAL_RESULTS_KEY = "Initialresults";

        // ===============================================
        // functions to do with filters
        // ===============================================

        // show the filter values
        var showfiltervals = function(event) {
            event.preventDefault();
            if ($(this).hasClass('facetview_open')) {
                $(this).children('i').removeClass('icon-minus');
                $(this).children('i').addClass('icon-plus');
                $(this).removeClass('facetview_open');
                $('[id="facetview_' + $(this).attr('rel') + '"]', obj)
                    .children().find('.facetview_filtervalue').hide();
                $(this).parent().parent()
                    .siblings('.facetview_filtervalue_hierarchic').hide();
                $(this).parent().parent()
                    .siblings('.facetview_filterdiv_hierarchic').hide();
                $(this).siblings('.facetview_filteroptions').hide();
            } else {
                $(this).children('i').removeClass('icon-plus');
                $(this).children('i').addClass('icon-minus');
                $(this).addClass('facetview_open');
                $('[id="facetview_' + $(this).attr('rel') + '"]', obj)
                    .children().find('.facetview_filtervalue').show();
                $(this).parent().parent()
                    .siblings('.facetview_filtervalue_hierarchic').show();
                $(this).parent().parent()
                    .siblings('.facetview_filterdiv_hierarchic').show();
                $(this).siblings('.facetview_filteroptions').show();

                var ml_button = $(this).parent()
                    .children('.facetview_filteroptions')
                        .children('.facetview_moreless');
                if (ml_button.text() === 'Less') {
                    ml_button.trigger('click');
                } else {
                    ml_button.trigger('click');
                    ml_button.trigger('click');
                }
            }
        };

        // show the filter values - the tree version
        var showfiltervalues = function(event) {
            event.preventDefault();
            event.target = $(event.target).closest(".facetview_filter").find(".facetview_showtree");
            var these = $(this);

            if (these.hasClass('facetview_open')) {
                these.removeClass('facetview_open');
                these.siblings().slideUp('fast');

                //   these.siblings('.facetview_tree').jstree('open_all');
            } else {
                these.addClass('facetview_open');
                if ($.inArray( $(event.target).attr("id"), options.rangehistogramfacets) !== -1){

                    var step = options.step || 1;


                    facetRangeHistogram(event, step);

                    if ($(event.target).attr("id").indexOf("items_count_") !== 0){
                        these.parent().find(".facetview_rangecontainer").slideDown('fast');
                    }

                    return;
                }
                if ($.inArray($(event.target).attr("id"), options.rangefacets) !== -1){
                    facetrange(event);

                    if ($(event.target).attr("id").indexOf("items_count_") !== 0){
                        these.parent().find(".facetview_rangecontainer").slideDown('fast');
                    }
                    return;
                }
                if ($.inArray($(event.target).attr("id"), options.geofacets) !== -1){
                    facetgeo(event);
                    these.parent().find(".facetview_geocontainer").slideDown('fast');
                    return;
                }
                var siblings = these.siblings();
                these.siblings('.facetview_tree').jstree('close_all');

                siblings.slideDown('fast');
                //find out if the list is checkbox type
                var checkbox = false;
                var length = options.facets.length;
                var title = these.attr('title');
                var facet_rel = title;
                //in the case of a checkbox list, disable the checked option

                for (var i = 0; i < length; i++) {
                    var item = options.facets[i];
                    if ('field' in item && (item.field === title || item.display === title)) {
                        var display_opt = item.facet_display_options;
                        facet_rel = item.field;
                        for (var opt in display_opt) {
                            if (display_opt[opt] === 'checkbox') {
                                checkbox = true;
                                break;
                            }
                        }
                        break;
                    }
                }
                if (checkbox) {
                    /* if the checkbox display option is set, checked values
                    should be as many as the ones in facetview_filterselected
                    */
                    var selected = $('.facetview_filterselected[rel="' +
                                     facet_rel + '"]');
                    var len = selected.length;
                    var checked = these.siblings('.jstree')
                                        .find('.jstree-clicked').length;
                    if (checked !== len) {
                        for (i = 0; i <= len; i++) {
                            var option = selected[i];
                            var rel = $(option).attr('rel');
                            var href = $(option).attr('href');
                            var box = $('li[rel="' + rel + '"][title="' +
                                        href + '"]');
                            box.find('.jstree-checkbox').trigger('click');
                        }
                    }
                }
            }
        };

        //recursive function that returns the json in a hierarchy
        var getJson = function(value, property, rel) {
            var count;
            count = '0';
            var jsonval = [];
            if (typeof value === 'string') {
                jsonval.push(
                    {
                        'text': '<span class="facet_label_count">' + count + '</span><span class="facet_label_text">' + value + '</span>',
                        'li_attr' : {
                            'rel' : property,
                            'class' : 'facetview_filterchoice leaf',
                            'title' : value
                        }
                    }
                );
                return jsonval;
            }
            if (value instanceof Array) {
                for (var element in value) {
                    jsonval = jsonval.concat(getJson(value[element], property));
                }
                return jsonval;
            }
            for (var element in value) {
                var children = value[element];
                if (children.length > 0) {
                    jsonval.push({
                        'text': '<span class="facet_label_count">' + count + '</span><span class="facet_label_text">' + value + '</span>',
                        'state': {
                            'opened' : true,
                            'selected' : false
                        },
                        'li_attr' : {
                            'rel' : property,
                            'class' : 'facetview_filterchoice',
                            'title' : element
                        },
                        'children': getJson(children, property)
                    });
                } else {
                    jsonval = jsonval.concat(getJson(element, property));
                }

            }
            return jsonval;
        };

        var clickexact = function(id){
            var set_exact = false;
            if ($(".facetview_exact[href='" + id + "']").attr("checked") === "checked"){
                set_exact = true;
            }
            var count_id = "items_count_" + id;
            var obj = $("[id='" +id+ "']");
            var count_obj = $("[id='" +count_id+ "']");
            if (!count_obj.hasClass("facetview_open")){
                count_obj.click();
            }
            var count_rel = count_obj.attr("eea_rel");
            var count_slider = $("#facetview_slider_" + count_rel);

            if (set_exact) {
                count_slider.slider("option", "values", [0,0]);
            }
            else {
                var facetview_group = $("#facetview_group_"+count_rel).find('i.eea-icon-times');
                if (facetview_group.length === 1){
                    facetview_group.click();
                }
                $("#facetview_group_"+count_rel).remove();
            }
            return set_exact;
        };
/* disable global exact search
        var toggleexact_all = function(event) {
            var set_exact = false;
            if ($(this).attr("value") === "exact"){
                set_exact = true;
            }
            var exacts = $(".facetview_exact");

            for (var i = 0; i < exacts.length; i++){
                var exact = exacts.eq(i);
                var id = exact.attr('href');
                if (set_exact){
                    exact.prop("checked", "checked");
                }
                else {
                    exact.prop("checked", "");
                }
                clickexact(id);
            }

            dosearch();
        };
*/
        var toggleexact = function(event) {
            var that = $(this);
            var id = that.attr('href');
            var exact_set = clickexact(id);
            if (exact_set) {
                dosearch();
            }
        };

        var selectFromAutocomplete = function(event, rel, title){
            var li = $(".facetview_tree[rel='" + rel + "'] li[rel='" + rel + "'][title='" + title + "']");
            var anchor;
            if (li.length > 0){
                //values already in facet
                anchor = li.find(".jstree-anchor");
                anchor.trigger("click");
            }
            else {
                var tree = $("div.facetview_tree[rel='" + rel + "']");
                var ord = "term";
                var opt = ["checkbox"];
                var text = $(event.target).closest("li.autocomplete_facet_value").html();
                var values = [{text:text, li_attr:{rel:rel, class:"facetview_filterchoice leaf", title:title}}];
                clickfilterchoice(false, rel, title, true);
                dosearch();
            }
            if ((anchor) && (!anchor.hasClass("jstree-clicked"))){
            }
        };

        // function to switch filters to OR instead of AND
        var orfilters = function(event) {
            event.preventDefault();
            var that = $(this);
            var id = 'facetview_group_' +
                that.attr('href').replace(/\./gi, '_').replace(/\:/gi, '_');
            var toc;
            if (that.attr('rel') === 'AND') {
                that.attr('rel', 'OR');
                that.text('any');
                that.css({'color': '#333'});
                toc = $('[id="' + id + '"]')
                    .children('.rel-between').text('OR');
                $('.facetview_filterselected[rel="' +
                    that.attr('href') + '"]', obj)
                    .addClass('facetview_logic_or');
            } else {
                that.attr('rel', 'AND');
                that.text('all');
                $('[id="' + id + '"]').children('.rel-between').text('AND');
                that.css({'color': '#aaa'});
                $('.facetview_filterselected[rel="' +
                    that.attr('href') + '"]', obj)
                    .removeClass('facetview_logic_or');
            }
            dosearch();
        };

        function createtreefromdata(tree, ord, opt, values) {
            var facet = tree.attr("rel");
            var facet_size = 10;
            var facet_whitelist = [];
            var facet_blacklist = [];
            var facet_length = eea_mapping.facets.length;
            var current_facet;
            for (var facet_idx = 0; facet_idx < facet_length; facet_idx++){
                current_facet = eea_mapping.facets[facet_idx];
                if (current_facet.name === facet){
                    facet_size = current_facet.size;
                    facet_whitelist = current_facet.values_whitelist;
                    facet_blacklist = current_facet.values_blacklist;
                    break;
                }
            }
            var whitelisted_values = [];
            var values_length = values.length;
            var current_value;
            if ((facet_whitelist !== undefined) && (facet_whitelist.length > 0)){
                for (var value_idx = 0; value_idx < values_length; value_idx++){
                    current_value = values[value_idx];
                    if (facet_whitelist.indexOf(current_value.li_attr.title) > -1){
                        whitelisted_values.push(current_value);
                    }
                }
            }
            else {
                whitelisted_values = values;
            }

            var blacklisted_values = [];
            var w_value_length = whitelisted_values.length;
            var c_whitelisted_value;
            if ((facet_blacklist !== undefined) && (facet_blacklist.length > 0)){
                for (var wvalue_idx = 0; wvalue_idx < w_value_length; wvalue_idx++){
                    c_whitelisted_value = whitelisted_values[wvalue_idx];
                    if (facet_blacklist.indexOf(c_whitelisted_value.li_attr.title) === -1){
                        blacklisted_values.push(c_whitelisted_value);
                    }
                }
            }
            else {
                blacklisted_values = whitelisted_values;
            }
            var nonzero_values = [];
            var number_regex = /[0-9]+/gi;

            if ((jQuery.inArray(facet, options.rangefacets) !== -1) || (jQuery.inArray(facet, options.rangehistogramfacets) !== -1)){
                if (values.length > 1){
                    tmp_values = [];
                    tmp_values.push(values[0]);
                    tmp_values.push(values[values.length - 1]);
                }
            }
            else {
                var bvalue_length = blacklisted_values.length;
                var c_b_value;
                var c_b_int_value;
                for (var bvalue_idx = 0; bvalue_idx < bvalue_length; bvalue_idx++){
                    c_b_value = blacklisted_values[bvalue_idx];
                    c_b_int_value =  parseInt(c_b_value.text.match(number_regex));
                    c_b_value['facet_count'] = c_b_int_value;
                    c_b_value['facet_title'] = c_b_value.li_attr.title;
                    if ( c_b_int_value !== 0){
                        nonzero_values.push(blacklisted_values[bvalue_idx]);
                    }
                }
            }

            var tmp_values = nonzero_values;

            // sort values before passing to jstree for inserting the values into the dom
            tmp_values.sort(function(a, b){
                if (ord === 'term') {
                    return a.facet_title > b.facet_title ? 1 : -1;
                } else if (ord === 'reverse_term') {
                    return b.facet_title > a.facet_title ? 1 : -1;
                } else if (ord === 'count'){
                    return a.facet_count - b.facet_count;
                } else {
                    return b.facet_count - a.facet_count;
                }
            });

            // pass only the slice of values set by facet_size
            tmp_values = tmp_values.slice(0, facet_size);

            if (!opt) {
                opt = [];
            }

            // remove sort from facet_display_options since we sort the values
            // in the above section greatly speeding the inserts
            var opt_length = opt.length;
            var opt_val;
            for (var o =0; o < opt_length; o++) {
                opt_val = opt[o];
                if (opt_val === "sort") {
                    opt.splice(o, 1);
                    break;
                }
            }
            if (tree.jstree && tmp_values.length) {
                tree.jstree({
                    'plugins' : opt,
                    'core' : {
                        'animation': 0,
                        'data' : tmp_values,
                        'check_callback' : true,
                        'themes' : {
                            'name' : 'default',
                            'icons' : false,
                            'dots': true
                        }
                    },
                    'checkbox' : {
                        'whole_node' : true,
                        'keep_selected_style' : false,
                        'tie_selection': false
                    }
                })
                .bind('select_node.jstree', function(event, data) {
                    var attributes = data.node.li_attr;
                    if (attributes.class.indexOf('leaf') > -1) {
                        clickfilterchoice(false, attributes.rel,
                            attributes.title, false);
                        dosearch();
                    } else {
                        var children = data.node.children_d;
                        var branch = $('#' + data.node.id);
                        tree.jstree('open_all', branch);

                        children.map(function(childID) {
                            var child = $('#' + childID);
                            if (child.hasClass('jstree-leaf')) {
                                clickfilterchoice(false, child.attr('rel'),
                                                child.attr('title'), false);
                            }
                        });
                        dosearch();
                    }
                })
                .bind('deselect_node.jstree', function(event, data) {
                    var attributes = data.node.li_attr;
                    $('.facetview_filterselected[rel="' + attributes.rel +
                      '"][href="' + attributes.title + '"]').trigger('click');
                    //reset
                    var parent_tree = $(this);
                    var lineHeight = parent_tree.find('.jstree-leaf').height();
                    parent_tree.height(10 * lineHeight + 'px');
                });
            }
            correctFacetRenderer();
        }

        // function to perform for sorting of filters
        var sortfilters = function(event) {
            event.preventDefault();
            var $this = $(event.currentTarget);

            var sortwhat = $this.data('sortwhat');
            var tree = $('.facetview_tree[rel="' + sortwhat + '"]');
            var facet = options.facets[options.facetids[sortwhat]];
            var values = tree.data("records");

            if ($this.hasClass("facet_count_order")){
                $this.closest(".facetview_filter_options")
                    .find(".facet_value_order")
                    .removeClass("facetview_term")
                    .removeClass("facetview_reverse_term");
                if ($this.hasClass("facetview_count")){
                    $this.removeClass("facetview_count");
                    $this.addClass("facetview_reverse_count");
                    $this.find(".eea-icon")
                        .removeClass("eea-icon-sort-amount-asc")
                        .addClass("eea-icon-sort-amount-desc");
                    facet.order = 'reverse_count';
                }
                else {
                    $this.removeClass("facetview_reverse_count");
                    $this.addClass("facetview_count");
                    $this.find(".eea-icon")
                        .removeClass("eea-icon-sort-amount-desc")
                        .addClass("eea-icon-sort-amount-asc");
                    facet.order = 'count';
                }
            }
            if ($this.hasClass("facet_value_order")){
                $this.closest(".facetview_filter_options")
                    .find(".facet_count_order")
                    .removeClass("facetview_count")
                    .removeClass("facetview_reverse_count");
                if ($this.hasClass("facetview_term")){
                    $this.removeClass("facetview_term");
                    $this.addClass("facetview_reverse_term");
                    $this.find(".eea-icon")
                        .removeClass("eea-icon-sort-alpha-asc")
                        .addClass("eea-icon-sort-alpha-desc");
                    facet.order = 'reverse_term';
                }
                else {
                    $this.removeClass("facetview_reverse_term");
                    $this.addClass("facetview_term");
                    $this.find(".eea-icon")
                        .removeClass("eea-icon-sort-alpha-desc")
                        .addClass("eea-icon-sort-alpha-asc");
                    facet.order = 'term';
                }
            }

            var ord = facet.order;

            if (facet.size >= Object.keys(values).length){
                var $filters = tree.find('li');
                var number_regex = /[0-9]+/gi;
                $filters.sort(function(a,b){
                    if (ord === 'term') {
                        return a.title > b.title ? 1 : -1;
                    } else if (ord === 'reverse_term') {
                        return b.title > a.title ? 1 : -1;
                    } else if (ord === 'count'){
                        return window.parseInt(a.innerText.match(number_regex)) - window.parseInt(b.innerText.match(number_regex));
                    } else {
                        return window.parseInt(b.innerText.match(number_regex)) - window.parseInt(a.innerText.match(number_regex));
                    }
                });
                $filters.detach().appendTo(tree.find('.jstree-container-ul'));
            }
            else {
                tree.jstree('destroy');
                createtreefromdata(
                        tree,
                        facet.order,
                        facet.facet_display_options,
                        resultsToJson(values, facet.field, facet.operator)
                    );
                correctFacetRenderer();
            }
        };
        // insert a geo facet once selected
        // noinspection JSLint
        var dofacetgeo = function(rel, dothesearch) {
            if (dothesearch === undefined){
                dothesearch = true;
            }
            $('a.facetview_filterselected[rel="' + rel + '"]').remove();
            $('#facetview_georesults_' + rel, obj).remove();
            $('#facetview_group_' + rel, obj).remove();
            // TODO: get the values

            var type = $('#facetview_geoplaceholder_' + rel, obj).find(".facetview_geo_type_"+rel).attr("value");

            var facet_display_value = "";
            var data = {};

            if (type === "distance"){
                var lat = $('#facetview_geoplaceholder_' + rel + ' .facetview_latval_' + rel, obj).attr("value");
                var lon = $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval_' + rel, obj).attr("value");
                var dist = $('#facetview_geoplaceholder_' + rel + ' .facetview_distval_' + rel, obj).attr("value");
                facet_display_value = "("  + lat + ", " + lon + ") - " + dist;
                data = {type:type, lat:lat, lon:lon, dist:dist};
            }
            else {
                var lat1 = $('#facetview_geoplaceholder_' + rel + ' .facetview_latval1_' + rel, obj).attr("value");
                var lon1 = $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval1_' + rel, obj).attr("value");
                var lat2 = $('#facetview_geoplaceholder_' + rel + ' .facetview_latval2_' + rel, obj).attr("value");
                var lon2 = $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval2_' + rel, obj).attr("value");
                facet_display_value = "("  + lat1 + ", " + lon1 + ") - ("  + lat2 + ", " + lon2 + ")";
                data = {type:type, lat1:lat1, lon1:lon1, lat2:lat2, lon2:lon2};

            }

            var href = $(this).attr('href');
            var newobj = [
                '<div style="display:none;" class="btn-group"',
                'id="facetview_georesults_',
                rel,
                '"> ',
                '<a class="facetview_filterselected facetview_facetgeo facetview_logic_or fores ',
                'facetview_clear btn btn-info"',
                'facettype="geo"',
                ' rel="',
                rel,
                '" alt="remove" title="remove" href="',
                href,
                '">',
                ' <i class="icon-white icon-remove hidden"></i></a></div>'
            ].join('');
            $('#facetview_selectedfilters', obj).append(newobj);
            $('#facetview_georesults_' + rel + " .facetview_filterselected").data("geo_data", data);

            options.paging.from = 0;

            var relclean = rel.replace(/\./gi, '_').replace(/\:/gi, '_');

            var myobj = '<div class="facetview_selection"> <a ' +
                        'class="facetview_filterselected facetview_logic_or facetview_facetgeo facetview_clear btn';

            myobj = [myobj,
                     '" ',
                     'facettype="geo"',
                     ' rel="',
                     rel,
                     '" alt="remove" title="remove" href="',
                     href,
                     '">',
                     ' <i class="icon-white icon-remove hidden"></i></a>',
                     facet_display_value,
                     '</div>'
                    ].join('');

            var op_text = 'all';
            if ($('div[id="facetview_group_' + relclean + '"]', obj).length) {
                myobj = '<a class="btn btn-small rel-between" rel="' + href +
                    '" style="color:#aaa">' + op_text + '</a>' + myobj;
                $('div[id="facetview_group_' + relclean + '"]', obj)
                    .append(myobj);

            } else {
                var title = options.facetnames ? options.facetnames[$("h2").filter("[eea_rel='" + rel + "']").attr('id')]: '';

                var pobj = [
                            '<div id="facetview_group_',
                            relclean,
                            '" class="btn-group facetview_selected">',
                            '<h3 class="facetview_group_title">',
                            title,
                            '</h3>',
                            myobj,
                            '</div>'
                            ].join('');
                if ($('div.facetview_selected').length) {
                    pobj = '<div class="facet-rel-between"> <a class="btn ' +
                            'btn-small facet_operator"> AND</a></div>' + pobj;
                }

            }

            $('#facetview_selected_filters', obj).append(pobj);
            if ($('.current-filters:hidden')) {
                $('.current-filters').show();
            }
            $('.facetview_filterselected[facettype="geo"]', obj).unbind('click', clearfacetgeo);
            $('.facetview_filterselected[facettype="geo"]', obj).bind('click', clearfacetgeo);

            if (dothesearch){
                dosearch();
            }
        };

        // insert a facet range once selected
        // TODO: UPDATE
        var dofacetrange = function(rel, use_html_values) {
            var $delete_icon = $('a.facetview_filterselected[rel="' + rel + '"]');
            // avoid double push state after deletion since range reverts to default values
            var avoid_pushtate = $delete_icon.length >= 1 ? false : true;
            var original_pushstate = options.from_popstate;
            $delete_icon.remove();

            $('#facetview_rangeresults_' + rel, obj).remove();
            $('#facetview_group_' + rel, obj).remove();
            var values = $('#facetview_slider_' + rel).data('all_values');
            var min = $('#facetview_slider_' + rel).slider('option', 'min');
            var max = $('#facetview_slider_' + rel).slider('option', 'max');

            if (use_html_values){
                min = $('#facetview_rangechoices_' + rel + ' .facetview_lowrangeval_' + rel).html();
                max = $('#facetview_rangechoices_' + rel + ' .facetview_highrangeval_' + rel).html();
            }
            if(values !== undefined && values.length > 0){
                if (parseFloat(min) === values[0] && parseFloat(max) === values[values.length - 1]){

                    if ($('.facetview_selected').length === 0) {
                        $('.current-filters').hide();
                    }

                    if (avoid_pushtate) {
                        options.from_popstate = true;
                    }
                    dosearch();
                    if (avoid_pushtate) {
                        options.from_popstate = original_pushstate;
                    }
                    return;
                }
            }

            var range = $('#facetview_rangechoices_' + rel, obj).html();
            var href = $(this).attr('href');
            var newobj = [
                '<div style="display:none;" class="btn-group"',
                'id="facetview_rangeresults_',
                rel,
                '"> ',
                '<a class="facetview_filterselected facetview_facetrange ',
                'facetview_clear btn btn-info"',
                'facettype="range"',
                ' rel="',
                rel,
                '" alt="remove" title="remove" href="',
                href,
                '">',
                range,
                ' <i class="icon-white icon-remove hidden"></i></a></div>'
            ].join('');

            $('#facetview_selectedfilters', obj).append(newobj);

            options.paging.from = 0;

            var relclean = rel.replace(/\./gi, '_').replace(/\:/gi, '_');

            var myobj = '<div class="facetview_selection"> <a ' +
                        'class="facetview_filterselected facetview_clear btn';
            var lowval = $("#facetview_rangechoices_" + rel + " .facetview_lowrangeval_" + rel).html();
            var highval = $("#facetview_rangechoices_" + rel + " .facetview_highrangeval_" + rel).html();
            var operation = $('.facetview_or[href="' + rel + '"]', obj);
            var op_text = 'all';
            myobj = [myobj,
                     '" ',
                     'facettype="range"',
                     ' rel="',
                     rel,
                     '" alt="remove" title="remove" href="',
                     href,
                     '">',
                     ' <i class="icon-white icon-remove hidden"></i></a>',
                     lowval,
                     ' - ',
                     highval,
                     '</div>'
                    ].join('');
            if ($('div[id="facetview_group_' + relclean + '"]', obj).length) {
                myobj = '<a class="btn btn-small rel-between" rel="' + href +
                    '" style="color:#aaa">' + op_text + '</a>' + myobj;
                $('div[id="facetview_group_' + relclean + '"]', obj)
                    .append(myobj);

            } else {
                var title = options.facetnames ? options.facetnames[$("h2").filter("[eea_rel='" + rel + "']").attr('id')]: '';

                var exact_helper_class = '';
                if ($("h2").filter("[eea_rel='" + rel + "']").attr('id').startsWith("items_count_")){
                    exact_helper_class = 'exact_helper';
                }

                var pobj = [
                            '<div id="facetview_group_',
                            relclean,
                            '" class="btn-group facetview_selected ' + exact_helper_class + '">',
                            '<h3 class="facetview_group_title">',
                            title,
                            '</h3>',
                            myobj,
                            '</div>'
                            ].join('');
                if ($('div.facetview_selected').length) {
                    pobj = '<div class="facet-rel-between"> <a class="btn ' +
                            'btn-small facet_operator"> AND</a></div>' + pobj;
                }

            }

            $('#facetview_selected_filters', obj).append(pobj);
            if ($('.current-filters:hidden')) {
                $('.current-filters').show();
            }
            $('.facetview_filterselected[facettype="range"]', obj).unbind('click',"dofacetrange", clearfacetrange);
            $('.facetview_filterselected[facettype="range"]', obj).bind('click',"dofacetrange", clearfacetrange);

            if (title.indexOf("#Count ") !== 0){
                dosearch();
            }

        };

        var dofacetrangeHistogram = function(rel, use_html_values, histogram_config, chosenValues) {
            if(typeof rel === "number") rel = rel.toFixed(0);
            var $delete_icon = $('a.facetview_filterselected[rel="' + rel + '"]');
            // avoid double push state after deletion since range reverts to default values
            var avoid_pushtate = $delete_icon.length >= 1 ? false : true;
            var original_pushstate = options.from_popstate;
            $delete_icon.remove();
            $('#facetview_rangeresults_' + rel, obj).remove();
            $('#facetview_group_' + rel, obj).remove();

            var values;

            if(sessionStorage.getItem(SLIDER_KEY + rel) !== null){
                values = JSON.parse( sessionStorage.getItem(SLIDER_KEY + rel) );
            } else {
                values = $('#facetview_slider_' + rel).data('all_values');
            }

            if(histogram_config.columns_bucket_min !== undefined || histogram_config.columns_bucket_max !== undefined){
                values = values.concat([
                    histogram_config.columns_bucket_min,
                    histogram_config.columns_bucket_max + 1
                ]).filter(Boolean);
                values.sort(function (a, b) {
                    return a-b;
                });
            }

            var min = $('#facetview_slider_' + rel).slider('option', 'min');
            var max = $('#facetview_slider_' + rel).slider('option', 'max');

            if (use_html_values){
                min = $('#facetview_rangechoices_' + rel + ' .facetview_lowrangeval_' + rel).html();
                max = $('#facetview_rangechoices_' + rel + ' .facetview_highrangeval_' + rel).html();
            }
            if(chosenValues !== undefined && chosenValues !== null){
                min = chosenValues.min || min;
                max = chosenValues.max || max;
            }
            if(values !== undefined && values.length > 0){
                if (parseFloat(min) === values[0] && parseFloat(max) === values[values.length - 1]){

                    if ($('.facetview_selected').length === 0) {
                        $('.current-filters').hide();
                    }

                    if (avoid_pushtate) {
                        options.from_popstate = true;
                    }
                    dosearch();
                    if (avoid_pushtate) {
                        options.from_popstate = original_pushstate;
                    }
                    return;
                }
            }


            var range = $('#facetview_rangechoices_' + rel, obj).html();
            var href = $(this).attr('href');
            var newobj = [
                '<div style="display:none;" class="btn-group"',
                'id="facetview_rangeresults_',
                rel,
                '"> ',
                '<a class="facetview_filterselected facetview_facetrange ',
                'facetview_clear btn btn-info"',
                'facettype="rangehistogram"',
                ' rel="',
                rel,
                '" alt="remove" title="remove" href="',
                href,
                '">',
                range,
                ' <i class="icon-white icon-remove hidden"></i></a></div>'
            ].join('');

            $('#facetview_selectedfilters', obj).append(newobj);

            options.paging.from = 0;

            var relclean = rel.replace(/\./gi, '_').replace(/\:/gi, '_');

            var myobj = '<div class="facetview_selection"> <a ' +
                'class="facetview_filterselected facetview_clear btn';

            var lowval = $("#facetview_rangechoices_" + rel + " .facetview_lowrangeval_" + rel).html();
            var highval = $("#facetview_rangechoices_" + rel + " .facetview_highrangeval_" + rel).html();
            var operation = $('.facetview_or[href="' + rel + '"]', obj);
            var op_text = 'all';
            myobj = [myobj,
                '" ',
                'facettype="rangehistogram"',
                ' rel="',
                rel,
                '" alt="remove" title="remove" href="',
                href,
                '">',
                ' <i class="icon-white icon-remove hidden"></i></a>',
                lowval,
                ' - ',
                highval,
                '</div>'
            ].join('');
            if ($('div[id="facetview_group_' + relclean + '"]', obj).length) {
                myobj = '<a class="btn btn-small rel-between" rel="' + href +
                    '" style="color:#aaa">' + op_text + '</a>' + myobj;
                $('div[id="facetview_group_' + relclean + '"]', obj)
                    .append(myobj);

            } else {
                var title = options.facetnames ? options.facetnames[$("h2").filter("[eea_rel='" + rel + "']").attr('id')]: '';

                var exact_helper_class = '';
                if ($("h2").filter("[eea_rel='" + rel + "']").attr('id').startsWith("items_count_")){
                    exact_helper_class = 'exact_helper';
                }

                var pobj = [
                    '<div id="facetview_group_',
                    relclean,
                    '" class="btn-group facetview_selected ' + exact_helper_class + '">',
                    '<h3 class="facetview_group_title">',
                    title,
                    '</h3>',
                    myobj,
                    '</div>'
                ].join('');
                if ($('div.facetview_selected').length) {
                    pobj = '<div class="facet-rel-between"> <a class="btn ' +
                        'btn-small facet_operator"> AND</a></div>' + pobj;
                }
            }

            $('#facetview_selected_filters', obj).append(pobj);
            if ($('.current-filters:hidden')) {
                $('.current-filters').show();
            }
            $('.facetview_filterselected[facettype="rangehistogram"]', obj).unbind('click',
                clearfacetrangeHistogram);
            $('.facetview_filterselected[facettype="rangehistogram"]', obj).bind('click',{ rel: rel},
                clearfacetrangeHistogram);

            if (title.indexOf("#Count ") !== 0){
                dosearch({rel: rel});
            }

        };

        // clear a facet geo
        var clearfacetgeo = function(event) {
            event.preventDefault();

            var rel = $(this).attr('rel');

            $('a.facetview_filterselected[rel="' + rel + '"]').remove();
            $('#facetview_georesults_' + rel, obj).remove();
            $('#facetview_group_' + rel, obj).remove();

            $('#facetview_geoplaceholder_' + rel + ' .facetview_latval_' + rel, obj).attr("value", "");
            $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval_' + rel, obj).attr("value", "");
            $('#facetview_geoplaceholder_' + rel + ' .facetview_distval_' + rel, obj).attr("value", "");
            $('#facetview_geoplaceholder_' + rel + ' .facetview_latval1_' + rel, obj).attr("value", "");
            $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval1_' + rel, obj).attr("value", "");
            $('#facetview_geoplaceholder_' + rel + ' .facetview_latval2_' + rel, obj).attr("value", "");
            $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval2_' + rel, obj).attr("value", "");

            if(('#radio_entire_map_' + rel).length > 0) {
                $('#radio_entire_map_' + rel).click();
            }

            dosearch();
        };
        // clear a facet range
        var clearfacetrange = function(event) {
            event.preventDefault();
            var rel = $(this).attr('rel');

            if($('#facetview_slider_' + rel).attr("type") !== undefined &&  $('#facetview_slider_' + rel).attr("type") === "rangehistogram" ){
                clearfacetrangeHistogram(event, rel);
            } else {
                var min = $('#facetview_slider_' + rel).slider('option', 'min');
                var max = $('#facetview_slider_' + rel).slider('option', 'max');
                delete options.facets[parseFloat(rel)].default_values;

                $('#facetview_slider_' + rel).slider('option', 'values', [min, max]);

                $('a.facetview_filterselected[rel="' + rel + '"]').remove();
                $('#facetview_rangeresults_' + rel, obj).remove();
                $('#facetview_group_' + rel, obj).remove();

                //if it was the last filter, hide header
                if ($('.facetview_selected').length === 0){
                    $('.current-filters').hide();
                }
                // dosearch();
            }
        };


        var resetSlider = [];

        var clearfacetrangeHistogram = function(event, relP){

            event.preventDefault();
            var rel = $(this).attr('rel') || relP;

            var $slider = $('#facetview_slider_' + rel);

            var min = $slider.slider('option', 'min');
            var max = $slider.slider('option', 'max');

            delete options.facets[parseInt(rel)].default_values;

            //$('#facetview_slider_' + rel).slider('option', 'values', [min, max]);
            resetSlider[rel] = true;
            $slider.slider("values", 0, min);
            resetSlider[rel] = true;
            $slider.slider("values", 1, max);

            $('a.facetview_filterselected[rel="' + rel + '"]').remove();
            $('#facetview_rangeresults_' + rel, obj).remove();
            $('#facetview_group_' + rel, obj).remove();

            //if it was the last filter, hide header
            if ($('.facetview_selected').length === 0) {
                $('.current-filters').hide();
            }

            dosearch();
        };

        var createfacetgeo = function (options){
            alert();
            var rel = options.rel;
            if ($("[id='facetview_geoplaceholder_" + rel + "']").length > 0) {
                return;
            }
            var defaults = $('a.facetview_filterselected[rel="' + rel + '"].fores').data("geo_data");

            var gmaps_loaded = (typeof google === 'object' && typeof google.maps === 'object') ? true : false;

            var geoselect = [
                '<div id="facetview_geoplaceholder_',
                rel,
                '" class="facetview_geocontainer clearfix" style="display:none"> ',
                '<div class="clearfix">',

                    '<div class="btn-group facetview_geo_options " id="facetview_geo_type_'+rel+'" >',
                        '<div id="shape_switchers_'+rel+'" class="shape-switcher-container">',
                            '<label for="radio_entire_map_'+rel+'">Entire map</label>',
                            '<input type="radio" name="radio-shape-switcher" id="radio_entire_map_'+rel+'">',

                            '<label for="radio_distance_area_'+rel+'">Distance area</label>',
                            '<input type="radio" name="radio-shape-switcher" id="radio_distance_area_'+rel+'">',

                            '<label for="radio_bounding_area_'+rel+'">Bounding area</label>',
                            '<input type="radio" name="radio-shape-switcher" id="radio_bounding_area_'+rel+'">',
                        '</div>',
                        '<button id="expand_map_'+rel+'" type="button" class="btn btn-default" >',
                            '<i class="icon-resize-full"></i>',
                        '</button>',
                    '</div>',

                    '<div id="geo-facet-tabs_'+rel+'">',
                        '<input class="facetview_geo_type_'+rel+'" type="text" style="display:none">',
                        '<div id="map_facet_'+rel+'" class="google_map_facet"></div>',
                        '<div id="geo_accordion_'+rel+'" class="geo-accordion">',
                            '<div id="distance_fields_'+rel+'">Distance area fields</div>',
                            '<div id="distance_fields_cont_'+rel+'">',
                                '<span style="font-weight:bold; width:100px;">Center</span><br/><br/>',
                                '<div style="clear:both"><!-- --></div>',
                                '<span>latitude</span><input class="facetview_latval_'+rel+'" type="text"><br/>',
                                '<span>longitude</span><input class="facetview_lonval_'+rel+'" type="text"><br/>',
                                '<span>distance(km)</span><input class="facetview_distval_'+rel+'" type="text"><br/>',
                            '</div>',
                            '<div id="bounding_fields_'+rel+'">Bounding area fields</div>',
                            '<div id="bounding_fields_cont_'+rel+'">',
                                '<span style="font-weight:bold; width:100px;">Top Left</span><br/><br/>',
                                '<div style="clear:both"><!-- --></div>',
                                '<span style="padding-left:10px">latitude</span><input class="facetview_latval1_'+rel+'" type="text"><br/>',
                                '<span style="padding-left:10px">longitude</span><input class="facetview_lonval1_'+rel+'" type="text"><br/>',
                                '<span style="font-weight:bold; width:100px;">Bottom Right</span><br/><br/>',
                                '<div style="clear:both"><!-- --></div>',
                                '<span style="padding-left:10px">latitude</span><input class="facetview_latval2_'+rel+'" type="text"><br/>',
                                '<span style="padding-left:10px">longitude</span><input class="facetview_lonval2_'+rel+'" type="text"><br/>',
                            '</div>',
                        '</div>',
                        '<div id="dialog_map_'+rel+'" title="Select area">',
                            '<div id="map_expanded_'+rel+'" class="google_map_dialog"></div>',
                        '</div>',

                    '</div>',
                '</div></div>'
            ].join('');
            $("[id='" + options.id + "']").after(geoselect);

            if (defaults !== undefined){
                var placeholder = $("#facetview_geoplaceholder_" + rel);
                placeholder.find(".facetview_geo_type_" + rel).attr("value", defaults.type);
                if (defaults.type === "distance"){
                    placeholder.find('.facetview_latval_'+rel).attr("value", defaults.lat);
                    placeholder.find('.facetview_lonval_'+rel).attr("value", defaults.lon);
                    placeholder.find('.facetview_distval_'+rel).attr("value", defaults.dist);
                }
                else {
                    placeholder.find('.facetview_latval1_'+rel).attr("value", defaults.lat1);
                    placeholder.find('.facetview_lonval1_'+rel).attr("value", defaults.lon1);
                    placeholder.find('.facetview_latval2_'+rel).attr("value", defaults.lat2);
                    placeholder.find('.facetview_lonval2_'+rel).attr("value", defaults.lon2);
                }
            }

            // $('.facetview_facetgeo_remove[facettype="geo"]', obj)
            //     .unbind('click', clearfacetgeo);
            // $('.facetview_facetgeo_remove[facettype="geo"]', obj)
            //     .bind('click', clearfacetgeo);

            var valsobj = $('.facetview_tree[rel="'+options.id+'"]', obj);
            var facet = options.id;


            $("#shape_switchers_"+rel).buttonset();

            $( "#geo_accordion_"+rel ).accordion({
                collapsible: true,
                heightStyle: "content",
                active: "false",

            });

            var bounds_shape = null;
            var distance_shape = null;
            var radius_changed_event = null;
            var center_changed_event = null;
            if (gmaps_loaded) {
                var default_distance;
                var default_bounds;

                // get the default coordinates for shape initialization
                // there might be a better place to do this in a cleaner way
                $.each(eea_mapping.facets, function (key, facet) {
                    if (facet.name === "geo_pos") {
                        if (facet.default_bounds !== undefined) {
                            default_bounds = facet.default_bounds;
                        } else {
                            default_bounds = {
                                "lat1": 50.738525,
                                "lng1": 9.981955,
                                "lat2": 46.738525,
                                "lng2": 18.981955
                            };
                        }

                        if (facet.default_distance !== undefined) {
                            default_distance = facet.default_distance;
                        } else {
                            default_distance = {
                                "lat": 48.738525,
                                "lng": 13.981955,
                                "rad": 250000
                            };
                        }
                    }
                });

                // init map
                var map_facet = new google.maps.Map($('#map_facet_' + rel)[0], {
                    center: {lat: 48.738525, lng: 13.981955},
                    zoom: 4,
                    streetViewControl: false
                });


                $('#radio_entire_map_' + rel).click(function () {
                    $('#facetview_geoplaceholder_' + rel, obj).find(".facetview_geo_type_" + rel).attr("value", "");

                    // reset variables from rect bounds
                    if (bounds_shape) {
                        google.maps.event.removeListener(bounds_changed_event);
                        bounds_shape.setMap(null);
                        bounds_shape = null;
                    }

                    // reset variables from distance radius
                    if (distance_shape) {
                        google.maps.event.removeListener(center_changed_event);
                        google.maps.event.removeListener(radius_changed_event);
                        distance_shape.setMap(null);
                        distance_shape = null;
                    }

                    // remove from current filters
                    if ($('a.facetview_filterselected[rel="' + rel + '"]').length > 0) {
                        $('a.facetview_filterselected[rel="' + rel + '"]').remove();
                        $('#facetview_georesults_' + rel, obj).remove();
                        $('#facetview_group_' + rel, obj).remove();

                        $('#facetview_geoplaceholder_' + rel + ' .facetview_latval_' + rel, obj).attr("value", "");
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval_' + rel, obj).attr("value", "");
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_distval_' + rel, obj).attr("value", "");
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_latval1_' + rel, obj).attr("value", "");
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval1_' + rel, obj).attr("value", "");
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_latval2_' + rel, obj).attr("value", "");
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval2_' + rel, obj).attr("value", "");
                        dosearch();
                    }
                });

                // translate the shape values to the facet fields
                function update_distance_fields(shape) {
                    var circle_center = shape.getCenter().toJSON();
                    // get only 6 decimal coordinates
                    var distval = Math.round(shape.getRadius() / 1000);
                    var latval = Math.round(circle_center.lat * Math.pow(10, 6)) / Math.pow(10, 6);
                    var lngval = Math.round(circle_center.lng * Math.pow(10, 6)) / Math.pow(10, 6);
                    $(".facetview_distval_" + rel).val(distval);
                    $(".facetview_latval_" + rel).val(latval);
                    $(".facetview_lonval_" + rel).val(lngval);

                }

                // translate the facet field values to the shape
                function update_distance_shape(shape) {
                    var distval = parseFloat($(".facetview_distval_" + rel).val());
                    var latval = parseFloat($(".facetview_latval_" + rel).val());
                    var lngval = parseFloat($(".facetview_lonval_" + rel).val());

                    distval = distval ? distval * 1000 : default_distance.rad;
                    latval = latval ? Math.round(latval * Math.pow(10, 6)) / Math.pow(10, 6) : default_distance.lat;
                    lngval = lngval ? Math.round(lngval * Math.pow(10, 6)) / Math.pow(10, 6) : default_distance.lng;

                    shape.setCenter({lat: latval, lng: lngval});
                    shape.setRadius(distval);

                }

                // click event on distance radius
                $('#radio_distance_area_' + rel).click(function () {
                    // reset variables from rect bounds
                    if (bounds_shape) {
                        google.maps.event.removeListener(bounds_changed_event);
                        bounds_shape.setMap(null);
                        bounds_shape = null;
                    }

                    // prevent adding multiple circles
                    if (!distance_shape) {

                        $('#facetview_geoplaceholder_' + rel, obj).find(".facetview_geo_type_" + rel).attr("value", "distance");

                        distance_shape = new google.maps.Circle({
                            strokeColor: '#00446A',
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                            fillColor: '#006699',
                            fillOpacity: 0.35,
                            map: map_facet,
                            editable: true,
                            draggable: true,
                        });

                        update_distance_shape(distance_shape);
                        update_distance_fields(distance_shape);

                        var radius_changed_event = google.maps.event.addListener(distance_shape, 'radius_changed', function () {
                            update_distance_fields(distance_shape);
                            dofacetgeo(rel);
                        });

                        // a delay is need for updating the center, this event fires a lot of times
                        var timeoutFlag = false;
                        var center_changed_event = google.maps.event.addListener(distance_shape, 'center_changed', function () {
                            if (!timeoutFlag) {
                                timeoutFlag = true;
                                setTimeout(function () {
                                    update_distance_fields(distance_shape);
                                    timeoutFlag = false;
                                    // update filter
                                    dofacetgeo(rel);
                                }, 1000);
                            }

                        });

                        dofacetgeo(rel);
                    } else {
                        // in case the shape is aleady active just sync the values
                        update_distance_shape(distance_shape);
                        update_distance_fields(distance_shape);
                        dofacetgeo(rel);
                    }
                });

                // translate the shape values to the facet fields
                function update_bounds_fields(shape) {
                    var rect_bounds = shape.getBounds().toJSON();
                    // get only 6 decimal coordinates
                    var latval1 = Math.round(rect_bounds.north * Math.pow(10, 6)) / Math.pow(10, 6);
                    var lngval1 = Math.round(rect_bounds.west * Math.pow(10, 6)) / Math.pow(10, 6);
                    var latval2 = Math.round(rect_bounds.south * Math.pow(10, 6)) / Math.pow(10, 6);
                    var lngval2 = Math.round(rect_bounds.east * Math.pow(10, 6)) / Math.pow(10, 6);

                    $(".facetview_latval1_" + rel).val(latval1);
                    $(".facetview_lonval1_" + rel).val(lngval1);
                    $(".facetview_latval2_" + rel).val(latval2);
                    $(".facetview_lonval2_" + rel).val(lngval2);

                }

                function update_bounds_shape(shape) {
                    var latval1 = parseFloat($(".facetview_latval1_" + rel).val());
                    var lngval1 = parseFloat($(".facetview_lonval1_" + rel).val());
                    var latval2 = parseFloat($(".facetview_latval2_" + rel).val());
                    var lngval2 = parseFloat($(".facetview_lonval2_" + rel).val());

                    latval1 = latval1 ? Math.round(latval1 * Math.pow(10, 6)) / Math.pow(10, 6) : default_bounds.lat1;
                    lngval1 = lngval1 ? Math.round(lngval1 * Math.pow(10, 6)) / Math.pow(10, 6) : default_bounds.lng1;
                    latval2 = latval2 ? Math.round(latval2 * Math.pow(10, 6)) / Math.pow(10, 6) : default_bounds.lat2;
                    lngval2 = lngval2 ? Math.round(lngval2 * Math.pow(10, 6)) / Math.pow(10, 6) : default_bounds.lng2;

                    var bounds = {
                        north: latval1,
                        south: latval2,
                        east: lngval2,
                        west: lngval1
                    };

                    shape.setBounds(bounds);

                }

                // click event on bounds
                $('#radio_bounding_area_' + rel).click(function () {
                    // reset variables from distance radius
                    if (distance_shape) {
                        google.maps.event.removeListener(center_changed_event);
                        google.maps.event.removeListener(radius_changed_event);
                        distance_shape.setMap(null);
                        distance_shape = null;
                    }

                    if (!bounds_shape) {

                        $('#facetview_geoplaceholder_' + rel, obj).find(".facetview_geo_type_" + rel).attr("value", "bounding-box");

                        bounds_shape = new google.maps.Rectangle({
                            strokeColor: '#00446A',
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                            fillColor: '#006699',
                            fillOpacity: 0.35,
                            map: map_facet,
                            draggable: true,
                            editable: true
                        });

                        update_bounds_shape(bounds_shape);
                        update_bounds_fields(bounds_shape);

                        // a delay is need for updating the bounds, this event fires a lot of times
                        var timeoutFlag = false;
                        var bounds_changed_event = google.maps.event.addListener(bounds_shape, 'bounds_changed', function () {
                            if (!timeoutFlag) {
                                timeoutFlag = true;
                                setTimeout(function () {
                                    update_bounds_fields(bounds_shape);
                                    timeoutFlag = false;
                                    // update filter
                                    dofacetgeo(rel);
                                }, 1000);
                            }

                        });

                        dofacetgeo(rel);
                    } else {
                        // in case the shape is aleady active just sync the values
                        update_bounds_shape(bounds_shape);
                        update_bounds_fields(bounds_shape);

                        dofacetgeo(rel);
                    }
                });


                // init the right shape
                if (defaults === undefined) {
                    $('#radio_entire_map_' + rel).click();

                } else {
                    if (defaults.type === "distance") {
                        $('#radio_distance_area_' + rel).click();
                    } else {
                        $('#radio_bounding_area_' + rel).click();
                    }
                }

                // watch field changes
                $("#geo_accordion_" + rel + " input", obj).change(function () {
                    var parent_id = $(this).parent().attr('id');
                    if (parent_id == "distance_fields_cont_" + rel) {
                        $('#radio_distance_area_' + rel).click();
                    } else if (parent_id == "bounding_fields_cont_" + rel) {
                        $('#radio_bounding_area_' + rel).click();
                    }
                });

                // Expanded map functionality
                $("#expand_map_" + rel).click(function () {
                    if ($('#facetview_geoplaceholder_' + rel, obj).find(".facetview_geo_type_" + rel).attr("value")) {
                        $("#dialog_map_" + rel).dialog("open");
                    }
                });

                var rect_ext = undefined;
                var circle_ext = undefined;

                $("#dialog_map_" + rel).dialog({
                    autoOpen: false,
                    modal: true,
                    width: 725,
                    heigth: 500,
                    resizable: true,
                    open: function (event, ui) {

                        var map_expanded = new google.maps.Map($('#map_expanded_' + rel)[0], {
                            center: {lat: 48.738525, lng: 13.981955},
                            zoom: 4,
                            streetViewControl: false
                        });

                        if ($('#facetview_geoplaceholder_' + rel, obj).find(".facetview_geo_type_" + rel).attr("value") === "distance") {
                            var circle_ext = new google.maps.Circle({
                                strokeColor: '#00446A',
                                strokeOpacity: 0.8,
                                strokeWeight: 2,
                                fillColor: '#006699',
                                fillOpacity: 0.35,
                                map: map_expanded,
                                editable: true,
                                draggable: true
                            });

                            update_distance_shape(circle_ext);
                        }

                        if ($('#facetview_geoplaceholder_' + rel, obj).find(".facetview_geo_type_" + rel).attr("value") === "bounding-box") {
                            var rect_ext = new google.maps.Rectangle({
                                strokeColor: '#00446A',
                                strokeOpacity: 0.8,
                                strokeWeight: 2,
                                fillColor: '#006699',
                                fillOpacity: 0.35,
                                map: map_expanded,
                                draggable: true,
                                editable: true,
                            });

                            update_bounds_shape(rect_ext);
                        }

                    },
                    close: function (event, ui) {
                        if (circle_ext) {
                            update_distance_fields(circle_ext);
                            update_distance_shape(distance_shape);
                        }

                        if (rect_ext) {
                            update_bounds_fields(rect_ext);
                            update_bounds_shape(bounds_shape);
                        }

                        map_expanded = null;
                        rect_ext = null;
                        circle_ext = null;

                        dofacetgeo(rel);
                    },
                    buttons: [
                        {
                            text: "OK",
                            click: function () {
                                $(this).dialog("close");
                            }
                        }
                    ]
                });

            } else {
                $('.facetview_geo_options').hide();
                $('.google_map_facet').hide();
                $('#dialog_map_' + rel).hide();

                // init the right shape
                if (defaults === undefined) {
                    $('#distance_fields_' + rel).click();

                } else {
                    if (defaults.type === "distance") {
                        $('#distance_fields_' + rel).click();
                    } else {
                        $('#bounding_fields_' + rel).click();
                    }
                }

                $("#geo_accordion_" + rel + " input", obj).change(function () {
                    var parent_id = $(this).parent().attr('id');
                    if (parent_id == "distance_fields_cont_" + rel) {
                        $('#facetview_geoplaceholder_' + rel, obj).find(".facetview_geo_type_" + rel).attr("value", "distance");
                    } else if (parent_id == "bounding_fields_cont_" + rel) {
                        $('#facetview_geoplaceholder_' + rel, obj).find(".facetview_geo_type_" + rel).attr("value", "bounding-box");
                    }

                    dofacetgeo(rel);
                });
            }


        };

        // build a facet geo selector
        var facetgeo = function(event) {
            event.preventDefault();
            var options = {rel : $(event.target).attr('eea_rel'),
                            id : $(event.target).attr('id')
            };
            createfacetgeo(options);

        };
        // build a facet range selector
        // noinspection JSLint
        var facetrange = function(event) {
            // TODO: when a facet range is requested, should hide the facet
            //list from the menu should perhaps also remove any selections
            //already made on that facet
            event.preventDefault();
            var rel = $(event.target).attr('eea_rel');
            if ($("[id='facetview_rangeplaceholder_" + rel + "']").length > 0) {
                return;
            }
            var exact_helper_class = '';
            if ($(event.target).hasClass('exact_helper')){
                exact_helper_class = 'exact_helper';
            }
            var rangeselect = [
                '<div id="facetview_rangeplaceholder_',
                rel,
                '" class="facetview_rangecontainer clearfix ' + exact_helper_class + '" style="display:none;"> ',
                '<div class="clearfix"> <h3 id="facetview_rangechoices_',
                rel,
                '" style="margin-left:20px; margin-right:20px; float:left; ',
                'clear:none;" class="clearfix"> <span ',
                'class="facetview_lowrangeval_',
                rel,
                '">...</span><input name="lowrangeval_'+ rel + '" class="disabled facetview_lowrangeval_'+ rel +'"  /> ',
                '<small>&nbsp&nbsp;</small>',
                '<span class="facetview_highrangeval_',
                rel,
                '">...</span>',
                '<input name="highrangeval_'+ rel +'" class="disabled text-right right facetview_highrangeval_'+ rel +'" />',
                '</h3> <div style="float:right;" ',
                'class="btn-group"> <a class="facetview_facetrange_remove ',
                'btn" rel="',
                rel,
                '" alt="remove" title="remove" href="#"><i ',
                'class="icon-remove hidden"> </i></a></div></div><div ',
                'class="clearfix" style="margin:20px;" id="facetview_slider_',
                rel,
                '"></div> </div>'
            ].join('');

            $("[id='" + $(event.target).attr('id') + "']").after(rangeselect);
            $('.facetview_facetrange_remove[facettype="range"]', obj)
                .unbind('click', "facetrange", clearfacetrange);
            $('.facetview_facetrange_remove[facettype="range"]', obj)
                .bind('click', "facetrange", clearfacetrange);

            var valsobj = $('.facetview_tree[rel="'+$(event.target).attr('id')+'"]', obj);

            var facet = $(event.target).attr('id');

            var minval = null;
            var maxval = null;
            for (var i = 0; i < options.facets.length; i++){
                if (options.facets[i].field === facet){
                    if (options.facets[i].default_values !== undefined){
                        minval = parseFloat(options.facets[i].default_values[0]);
                        maxval = parseFloat(options.facets[i].default_values[1]);
                    }
                }
            }
            var values = valsobj.data("values");

            var lowrangeText = $("#facetview_rangechoices_" + rel + " span.facetview_lowrangeval_" + rel, obj );
            var highrangeText = $('#facetview_rangechoices_' + rel + ' span.facetview_highrangeval_' + rel , obj);
            var lowrangeInput = $("#facetview_rangechoices_" + rel + " input.facetview_lowrangeval_" + rel, obj );
            var highrangeInput = $('#facetview_rangechoices_' + rel + ' input.facetview_highrangeval_' + rel , obj);

            var $slider = $('#facetview_slider_' + rel, obj);

            lowrangeText.hide();
            highrangeText.hide();

            var dec = 0;
            var min = 0;
            var max = values.length - 1;

            for (var i = 0; i < values.length; i++){
                if (values[i] === minval){
                    min = i;
                }
                if (values[i] === maxval){
                    max = i;
                }
            }
            var facet = $(event.target).attr('id');
            min = Math.max(0, min);
            max = Math.min(values.length - 1, max);

            lowrangeInput.on("click", function (e) {
                e.preventDefault();
                lowrangeInput.val(lowrangeText.html());
                lowrangeInput.removeClass("disabled").focus();
            });

            lowrangeInput.on("focus", function (e) {
                e.preventDefault();
                lowrangeInput.removeClass("disabled");
            });

            lowrangeInput.on("blur", function(e){

                lowrangeInput.addClass("disabled");

                var newval = parseFloat($(e.target).val());

                var re = null;
                if(newval < values[0] || newval >= values[values.length-1]){
                    re = values[0];
                } else {
                    re = values.filter(function(item, index){
                        var larger = newval >= item;
                        var smaller = newval < values[index+1];
                        return smaller && larger;
                    })[0];

                }
                lowrangeText.html(re);
                lowrangeInput.val(re);

                var sliderPos = Object.keys(values).filter(function(key) {return values[key] === re})[0];

                if(sliderPos !== $slider.slider("values", 0) ) $slider.slider("values", 0, sliderPos);

            });


            highrangeInput.on("click", function (e) {
                e.preventDefault();
                highrangeInput.val(highrangeText.html());
                highrangeInput.removeClass("disabled").focus();
            });

            highrangeInput.on("focus",function(e){
                e.preventDefault();
                highrangeInput.removeClass("disabled");
            });

            highrangeInput.on("blur", function(e){

                highrangeInput.addClass("disabled");

                var newval = parseFloat($(e.target).val());

                var re = null;
                if(newval < values[0] || newval >= values[values.length-1]){
                    re = values[values.length-1];
                } else {
                    re = values.filter(function(item, index){
                        var larger = newval >= item;
                        var smaller = newval < values[index+1];
                        return smaller && larger;
                    })[0];
                }

                highrangeText.html(re);
                highrangeInput.val(re);

                var sliderPos = Object.keys(values).filter(function(key) {return values[key] === re})[0];

                if(sliderPos !== $slider.slider("values", 1) ) $slider.slider("values", 1, sliderPos);

            });

            if(min === values[0] && max === values[values.length-1]) {
                delete options.facets[parseInt(rel)].default_values;
                $('a.facetview_filterselected[rel="' + rel + '"]').remove();
                $('#facetview_rangeresults_' + rel, obj).remove();
                $('#facetview_group_' + rel, obj).remove();
            }

            $('#facetview_slider_' + rel, obj).slider({
                range: true,
                min: 0,
                max: values.length - 1,
                values: [min, max],
                slide: function( event, ui ) {
                    $('#facetview_rangechoices_' + rel + ' .facetview_lowrangeval_' + rel, obj).html( values[ ui.values[0] ] );
                    $('#facetview_rangechoices_' + rel + ' .facetview_highrangeval_' + rel, obj).html( values[ ui.values[1] ] );
                    lowrangeInput.val( values[ ui.values[0] ] );
                    highrangeInput.val( values[ ui.values[1] ]);
                },
                change: function( event, ui ) {
                    if (ui === undefined){
                        return;
                    }
                    $('#facetview_rangechoices_' + rel + ' .facetview_lowrangeval_' + rel, obj).html( values[ ui.values[0] ] );
                    $('#facetview_rangechoices_' + rel + ' .facetview_highrangeval_' + rel, obj).html( values[ ui.values[1] ] );
                    lowrangeInput.val( values[ ui.values[0] ]  );
                    highrangeInput.val( values[ ui.values[1] ] );

                    dofacetrange( rel );
                }
            });

            $('#facetview_rangechoices_' +
                rel +
                ' .facetview_lowrangeval_' +
                rel, obj
            ).html(values[min]);
            $('#facetview_rangechoices_' +
                rel +
                ' .facetview_highrangeval_' +
                rel, obj
            ).html(values[max]);

            lowrangeInput.val(values[min]);
            highrangeInput.val(values[max]);
        };

        function createValuesObj(set) {
            var result = [];

            if( set === undefined || set === null) return result;

            $.each(Object.keys(set), function(index, setKey){
                if (setKey === undefined) return true;
                var y = parseInt(set[setKey]);
                result.push({ x: parseFloat(setKey), y: y  });
            });

            result.sort(function(a,b){
                return parseFloat(a.x) - parseFloat(b.x);
            });

            return result;
        }

        // will start at the first multiple of 10 ex: for 1953 will set 1950, for 10.3 will set 10, for 11 will set 10 etc
        // TODO include step, ex: for set between 11.1 to 11.9 with a step of 0.1 will set 11
        function getFirstValue(value, interval) {
            return  Math.floor( parseFloat(value) / parseFloat(interval)) * parseFloat(interval);
        }

        function getLastValue(value, interval){
            return ( Math.floor( parseFloat(value) / parseFloat(interval) ) * parseFloat(interval) + parseFloat(interval));
        }

        // will determine the maximum value (x) of all element in array
        function getMaxValue(list) {
            var max = 0;
            for(var i=0; i < list.length; i++) {
                if(list[i].x > max) {
                max = list[i].x;
                }
            }
            return max;
        }

        // based on the first value and interval, will group the items corresponding to the interval
        // all items within an interval will be added, missing intervals, will appear with value 0
        // ex for [{y: 1935, x: 3}, {y: 1936, x: 3}, {y: 1954, x: 3}, {y: 1959, x: 3}] and interval 10
        //  =>   var dataset =
        //   [ {y: 1930, x: 8}, // 1930-1939
        //     {y: 1940, x: 0}, // 1940-1949 missing
        //     {y: 1950, x: 3}, // 1950-1959
        //   ]
        function groupDatasetByInterval(dset, intervalInput,set_min, set_max, discrete = false) {
            var result = []; // reset to 0 if for example interval starts at 1953
            var dec = (Number(intervalInput) === intervalInput && intervalInput % 1 !== 0) ?  2 : 0 ;
            var limit = dec === 2 ? 0.01 : 1;
            if (discrete === true){
                limit = 0
            }
            var intervalRangeStart = getFirstValue(set_min, intervalInput);

            var intervalRangeEnd =  getLastValue( set_max-1 , intervalInput) - limit;

            var i = intervalRangeStart;

            while( i <= intervalRangeEnd) {

                var filt = dset.filter( function(item){
                    var max = (i + intervalInput) - limit;
                    var larger = item.x >= i;
                    var smaller = item.x <= max;
                    return larger && smaller;
                });

                var vals = filt.reduce(function(prev, curr){
                    return parseInt(prev) + parseInt(curr.y);
                },0);

                result.push( { x: i, y: vals} );

                i += intervalInput;
            }

            return result.filter(function(item){
                return item.x <= set_max;
            });
        }

        function groupDatasetByIntervalWithExtremes(set, intervalInput, histogram_config) {
            var discrete = histogram_config.discrete_values;
            if (discrete !== true){
                discrete = false;
            }
            if(set.length === 0) return [];
            var dec = (Number(intervalInput) === intervalInput && intervalInput % 1 !== 0) ?  2 : 0 ;
            var limit = dec === 2 ? 0.01 : 1;
            var set_min, set_max;

            if (histogram_config.columns_bucket_min === null){
                histogram_config.columns_bucket_min = undefined;
            }
            if (histogram_config.columns_bucket_max === null){
                histogram_config.columns_bucket_max = undefined;
            }

            if( histogram_config.columns_bucket_min !== undefined ){
                set_min = histogram_config.columns_bucket_min;
            } else {
                set_min = set[0].x;
            }

            if( histogram_config.columns_bucket_max !== undefined ){
                set_max = histogram_config.columns_bucket_max;
                //var set_max = histogram_config.columns_bucket_max - limit;
//                var set_max_I = set_max;
            } else {
                set_max = set[set.length-1].x;
//                var set_max_I = set_max + intervalInput;
            }


            var minArr = histogram_config.columns_bucket_min !== null ?
                set.filter( function (item, index){
                    return item.x < set_min;
            }): [];

            var maxArr = histogram_config.columns_bucket_max !== null ?
                set.filter(function (item, index) {
                    return item.x > set_max;
            }) : [];

            var dataset = set.filter(function (item, index) {
                return item.x >= set_min && item.x <= set_max;
            });

            var resultT = groupDatasetByInterval(dataset, intervalInput, set_min, set_max, discrete);
            var set_max_I = resultT[resultT.length - 1].x + intervalInput;

            var minArrRes = [];
            var maxArrRes = [];

            /// min offset
            if(minArr.length > 0){
                var minFirst = minArr[0].x;
                var minArrResT = 0;

                $.each(minArr, function(key,item){
                    minArrResT = minArrResT + parseInt(item.y);
                });
                minArrRes = [{
                    x:minFirst, y: minArrResT,
                    color: histogram_config.columns_min_color,
                    from:set[0].x.toFixed(dec),
                    to: set_min.toFixed(dec),
                    extreme:  true
                }];
            } else if(histogram_config.columns_bucket_min !== undefined) {
                minArrRes = [{
                    x:set[0].x,
                    y: 0,
                    color: histogram_config.columns_min_color,
                    from: set[0].x.toFixed(dec),
                    to: set_min.toFixed(dec),
                    extreme: true
                }];
            }

            //max offset
            if(maxArr.length > 0){
                var maxLast = maxArr[maxArr.length-1].x;
                var maxArrResT = 0;

                $.each(maxArr, function(key,item){
                    maxArrResT = maxArrResT + parseInt(item.y);
                });

                maxArrRes = [{
                    x: set_max,
                    y: maxArrResT,
                    color: histogram_config.columns_max_color,
                    from: (set_max+1).toFixed(dec),
                    to: set[set.length-1].x.toFixed(dec),
                    extreme:  true
                }];
            } else if(histogram_config.columns_bucket_max !== undefined) {
                maxArrRes = [{
                    x: set_max,
                    y: 0,
                    color: histogram_config.columns_max_color,
                    from: (set_max+1).toFixed(dec),
                    to: set[set.length-1].x.toFixed(dec),
                    extreme:  true
                }];
            }

            var tempR =  minArrRes.concat(resultT).concat(maxArrRes);

            var result = tempR.map(function(item, index, arr){
                var limit = dec === 2 ? 0.01 : 1;
                if (item.x !== undefined) {

                    if (!item.from || !item.to && item.extreme === undefined) {

                        if (item.from === undefined) {
                            //if(arr[index - 1] !== undefined){
                                item.from = (item.x).toFixed(dec);
                            //} else {
                                //item.from = set_min.toFixed(dec);
                            //}
                        }
                        if (item.to === undefined) {
                            if (discrete){
                                item.to = item.from;
                            }
                            else {
                                if(arr[index + 1] !== undefined){
                                    item.to = ( arr[index + 1].x - limit).toFixed(dec);
                                } else {
                                    item.to = set_max_I.toFixed(dec);
                                }
                            }
                        }
                    }
                }
                return item;
            })
            // filter out duplicates with same x
            .map(function(item, index, arr){
                if(arr[index+1] !== undefined && item.x === arr[index+1].x){
                    var t = arr[index+1].y + item.y;
                    arr[index+1].y = t;
                    return null;
                } else {
                    return item;
                }
            }).filter(Boolean);

            return result;

        }

        // based on the first value, step and interval, will generate missing values
        // the length of the result array will be a multiple of the interval
        // ex for [1950, 1957, 1960], step 1 and interval 10 => [1950, 1951,.. 1957,..1959, 1960..1969]
        function fillMissingValues(intervalInput, sliderInterval, groupedDataset) {
            if(groupedDataset.length === 0) return [];
            var result = [];

            groupedDataset = uniqueArray(groupedDataset);

            var dec = (Number(sliderInterval) === sliderInterval && sliderInterval % 1 !== 0) ?  2 : 0 ;

            var intervalRangeStart = (groupedDataset[0].x !== undefined) ?  groupedDataset[0].x : groupedDataset[0];
            var intervalRangeEnd = groupedDataset[groupedDataset.length - 1].x !== undefined ? groupedDataset[groupedDataset.length - 1].x
                : groupedDataset[groupedDataset.length - 1] ;

            var i = intervalRangeStart;

            result.push(parseFloat(intervalRangeStart.toFixed(dec)));

            while(i < intervalRangeEnd){
                var t = i + sliderInterval;
                if(t === intervalRangeEnd){
                    i = parseFloat(intervalRangeEnd.toFixed(dec));
                } else {
                    i = parseFloat(t.toFixed(dec));
                }
                result.push( parseFloat (i.toFixed(dec) ));
            }

            return result;
        }

        function fillMissingValuesWithExtremes(intervalInput, sliderInterval, groupedDataset, set, histogram_config){
            if(groupedDataset.length === 0){
                return [];
            }
            var sliderRatio = intervalInput / sliderInterval;

            var gDataset = groupedDataset.map(function(item, index){
                return item.x;
            });
            //add last item to group

            gDataset.push(parseFloat(groupedDataset[groupedDataset.length-1].to));

            gDataset = uniqueArray(gDataset);

            if( histogram_config.columns_bucket_min !== undefined ){
                if(histogram_config.columns_bucket_min === null ){
                    var col_min = set[0].x;
                } else {
                    var col_min = histogram_config.columns_bucket_min;
                }
            } else {
                var col_min = gDataset[0];
            }

            if( histogram_config.columns_bucket_max !== undefined ){
                if(histogram_config.columns_bucket_max === null ){
                    var col_max = set[set.length-1].x;
                } else {
                    var col_max = histogram_config.columns_bucket_max;
                }
            } else {

                var col_max = set[set.length-1].x;
            }

            var minArrG = histogram_config.columns_bucket_min !== null ?
                gDataset.filter(function(item, index) {
                    return item < histogram_config.columns_bucket_min;
            }) : [];

            var maxArrG = histogram_config.columns_bucket_max !== null ?
                gDataset.filter(function(item, index) {
                    return item > histogram_config.columns_bucket_max;
            }) : [];

            var datasetG = ( histogram_config.columns_bucket_min !== undefined || histogram_config.columns_bucket_max !== undefined ) ?
                gDataset.filter(function (item, index) {
                    return item >= col_min && item <= col_max;
            }) : gDataset;


            if(datasetG.length > 0){
                var result = fillMissingValues(intervalInput, sliderInterval, datasetG.concat(col_max));
            } else {
                var result = [];
            }

            if(minArrG.length > 0){
                var tmpArrMin = [
                    gDataset[0],
                    col_min
                ];
                var tminArrG = fillMissingValues(null, (tmpArrMin[1] - tmpArrMin[0])/sliderRatio, tmpArrMin).slice(0,-1).map(Math.floor);
            } else {
                var tminArrG = [];
            }

            if(maxArrG.length > 0){
                var tmpArrMax = [
                    col_max+1,
                    gDataset[gDataset.length-1]
                ];

                var tmaxArrG = fillMissingValues(null, (tmpArrMax[1] - tmpArrMax[0])/sliderRatio, tmpArrMax).slice(1).map(Math.floor);
            } else {
                var tmaxArrG = [];
            }

            var res = tminArrG.concat(result).concat(tmaxArrG);

            if(res[0] > gDataset[0] ) res = [gDataset[0]].concat(res);
            if(res[res.length-1] < gDataset[gDataset.length-1] ){ res = res.concat([gDataset[gDataset.length-1]])}
            return res;
        }

        function checkInitialSearch(){
            var url_optionsC = url_options;
            if(url_optionsC.source === undefined){
                var url_optionsC = $.getUrlVars(options);
                return true;
            }
            if( url_optionsC.source !== undefined && url_optionsC.source.query.bool === undefined ){
                return true;
            } else if(url_optionsC.source.query.function_score !== undefined && url_optionsC.source.query.function_score.query === undefined ) {
                return true;
            }

            /*if(url_options.source.query !== undefined && url_options.source.query.function_score.query.bool.must !== undefined){
                var qs = JSON.parse( JSON.stringify( url_options.source.query.function_score.query.bool.must ));
                var predefined = options.predefined_filters;
                if( JSON.stringify(qs) === JSON.stringify(predefined) ){
                  return true;
                }  else {

                }
            }*/
        }

        function populateEmptyGroupFromNewData(sourceG, targetG){
            if(sourceG.length > 0){

                $.each(sourceG, function(kg, group){
                    var yArr = [];

                    $.each(targetG,function(kdG, dataG){
                        if( sourceG[kg + 1] !== undefined){
                            if( dataG.x >= group.x && dataG.x < sourceG[kg + 1].x ){
                                if( sourceG[kg].y !== dataG.y && dataG !== undefined){
                                    yArr.push(dataG.y);
                                }
                            }
                        } else {
                            if( dataG.x >= group.x && dataG !== undefined){
                                yArr.push(dataG.y);
                            }
                        }
                    });

                    sourceG[kg].y = yArr.reduce(function(prev, curr){
                        return prev + curr;
                    }, 0);

                });
                return sourceG;
            }
            return [];
        }


        function facetRangeHistogram(event,  step) {
            event.preventDefault();
            var rel = $(event.target).attr('eea_rel');
            var valsobj = $('.facetview_tree[rel="'+$(event.target).attr('id')+'"]', obj);

            var facet = $(event.target).attr('id');
            var facetOptions = options.facets.filter(function(f){
                return f.field === facet;
            })[0];
            var histogram_config = facetOptions.histogram_config;

            var intervalInput = histogram_config.columns_bucketsize || 10;
            var sliderInterval = histogram_config.slider_bucketsize || 2;

            var datasetFilledMissing = createValuesObj(valsobj.data("group_values"));

            var datasetGroupByInterval = [];

            sessionStorage.removeItem(GROUPS_KEY + rel);

            // get group from storage
            if( sessionStorage.getItem(GROUPS_KEY + rel) !== null){

                var groupFromSession = JSON.parse( sessionStorage.getItem(GROUPS_KEY + rel) );

                datasetGroupByInterval = populateEmptyGroupFromNewData(groupFromSession, datasetFilledMissing);

            } else {
            //get groups from InitialResults

                //if(datasetGroupByInterval.length === 0) datasetGroupByInterval = [{x:0, y:0}];

                var InitialResults = JSON.parse(sessionStorage.getItem(INITIAL_RESULTS_KEY) );

                if(InitialResults === null){
                    dosearch();
                }
                var sessionData = parseresults(InitialResults);

                var valsFromSession = sessionData.facets[options.facets[rel].field];

                var filteredResults = {};
                $.each(Object.keys(valsFromSession) , function(k, v){
                    if(v !== "undefined"){
                        var key = parseFloat(v);
                        filteredResults[key] = valsFromSession[key];
                    }
                });

                var emptyDatasetGroupByInterval = groupDatasetByIntervalWithExtremes( createValuesObj(filteredResults), intervalInput, histogram_config)
                    .map(function(item){
                        item.y = 0;
                       return item;
                    });

                datasetGroupByInterval = populateEmptyGroupFromNewData(emptyDatasetGroupByInterval,datasetFilledMissing );

            }

            var $slider = $('#facetview_slider_' + rel, obj);

            var url_options = $.getUrlVars(options);

            renderSliderHistogram(rel, event, step,
                datasetFilledMissing, datasetGroupByInterval, intervalInput,
                sliderInterval, histogram_config);


            if(histogram_config.histogram === undefined || histogram_config.histogram !== false ){
                setTimeout(function(){
                    // used setTimout to allow DOM to create the slider
                    // we need it to determine the width of the histogram
                    renderHistogram(rel, datasetGroupByInterval, intervalInput, event.target, sliderInterval);
                    if( checkInitialSearch()){
                        Object.keys(sessionStorage).map(function(key){
                            if(key.indexOf(GROUPS_KEY ) !== -1 ||
                                key.indexOf(SLIDER_KEY ) !== -1
                            ){
                                sessionStorage.removeItem(key);
                            }
                        });
                        var $Sdata = $slider.data("all_values");
                        if( $Sdata ){
                            setValueInSessionStorage( SLIDER_KEY + rel, JSON.stringify( $slider.data("all_values")) );
                        }

                        setValueInSessionStorage( GROUPS_KEY + rel, JSON.stringify( datasetGroupByInterval.map(function(item){
                            if(item.extreme === undefined){
                                delete item.color;
                                //item.color = "#faa";
                            }
                            item.y = 0;
                            //
                            return item;
                        })));
                    }
                    //renderHistogramCanvas(rel, datasetGroupByInterval, intervalInput, event, sliderInterval);
                });
                $(window).on('resize', function(){
                    renderHistogram(rel, datasetGroupByInterval, intervalInput, event.target, sliderInterval);
                    //renderHistogramCanvas(rel, datasetGroupByInterval, intervalInput, event, sliderInterval);
                });
            }

        }

        /*function renderHistogramCanvas(rel, dataset, intervalInput, event, sliderInterval){
            var histogramHeight = null;

            var histoDataset = dataset.map(function(item) {
                return { x: item.y, y: item.x };
            });
            if( histoDataset[histoDataset.length - 1].x === 0 ){
                histoDataset.splice(-1,1);
            }

            var facet = $(event.target).attr('id');
            var facetOptions = options.facets.filter(function(f){
                return f.field === facet;
            })[0];

            var histogram_config = facetOptions.histogram_config;

            var sliderWidth = $( "#facetview_slider_" + rel).width() + 2;

            if(histogram_config.ratio){
                histogramHeight = sliderWidth / histogram_config.ratio;
            } else if(histogram_config.container_height){
                histogramHeight =  histogram_config.container_height;
            } else {
                histogramHeight = 150;
            }

            var padding = 1;

            var barColor = histogram_config.bar_color || "#5393B4";
            var datasetLength = histoDataset.length;

            var barW = sliderWidth / datasetLength-1 - padding;

            var tooltip = d3.select('#facetview_rangehistogramplaceholder_container'+ rel).append("div")
                .classed('histogram-tooltip', true)
                .classed('hidden', true);

            // delete previous histogram and rerender
            $('#facetview_rangehistogramplaceholder_container'+ rel).html('');

            var canvas =  d3.select('#facetview_rangehistogramplaceholder_container'+ rel).append("canvas")
                .attr("width", sliderWidth  )
                .attr("height", histogramHeight);

            var context = canvas.node().getContext("2d");

            // Create an in memory only element of type 'custom'
            var detachedContainer = document.createElement("custom");

            // Create a d3 selection for the detached container. We won't
            // actually be attaching it to the DOM.
            var dataContainer = d3.select(detachedContainer);

            d3.timer(drawCanvas);
            drawCustom(histoDataset);

            function drawCustom(data) {

                var yScale = d3.scaleLinear()
                    .domain([0, getMaxValue(histoDataset)])
                    .range([2, histogramHeight]) // even a 0 will be represented so that we can have tooltip
                    .nice();

                var dataBinding = dataContainer.selectAll("custom.rect")
                    .data(data, function(d) {
                        return d; });

                // update existing element to have size 15 and fill green

                dataBinding
                    .attr("size", barW)
                    .attr("fillStyle", barColor);

                // for new elements, create a 'custom' dom node, of class rect
                // with the appropriate rect attributes
                dataBinding.enter()
                    .append("custom")
                    .classed("rect", true)
                    .transition()
                    .duration(1000)
                    .attr("x", function(d, i) {
                        return i * ((sliderWidth / datasetLength-1) + padding);
                    })
                    .attr("y", function(d) {
                        if(d.x === getMaxValue(histoDataset)){
                            return 0;
                        }
                        return histogramHeight - yScale(d.x);})

                    .attr("size", function(d) {
                        if(d.x === getMaxValue(histoDataset)){
                            return histogramHeight + yScale(d.x);
                        }
                        if(d.x === 0){
                            return 0;
                        }
                        return yScale(d.x);
                    })


                    .attr("fillStyle", barColor)
                    /!*.on("mouseover", function(d) {
                        tooltip.transition()
                            .duration(200);
                        tooltip.html( function(){
                            var max = (d.y + intervalInput === histoDataset[histoDataset.length - 1].y + intervalInput ) ?
                                histoDataset[histoDataset.length - 1].y + intervalInput : (d.y + intervalInput - 1);

                            return "<p><strong>" + d.y + " to " + max + "</strong></p><p><span>Results: " + d.x + "</span></p>";
                        })
                            .classed('hidden', false)
                            .style("left", function() {
                                return (d3.event.offsetX - $(this).width()) + "px"})
                            .style("top", (d3.event.offsetY - $(this).height()/2) + "px");
                    })
                    .on("mouseout", function(d) {
                        tooltip.transition().duration(500);
                        tooltip.classed('hidden', true);
                    });*!/

                // for exiting elements, change the size to 5 and make them grey.
                dataBinding.exit()
                    .attr("size", 5)
                    .transition()
                    .duration(1000)
                    .attr("fillStyle", barColor);


                drawCanvas();
            }

            function drawCanvas() {

                // clear canvas
                context.fillStyle = "#fff";
                context.rect(0,0,canvas.attr("width"),canvas.attr("height"));
                context.fill();

                var elements = dataContainer.selectAll("custom.rect");
                elements.each(function(d) {
                    var node = d3.select(this);

                    context.beginPath();
                    context.fillStyle = node.attr("fillStyle");
                    context.rect(node.attr("x"), node.attr("y"), barW, node.attr("size"));
                    context.fill();
                    context.closePath();

                });
            }

        }*/

        function renderHistogram(rel, dataset, intervalInput, target, sliderInterval, fromRefresh) {
            var histogramHeight = null;

            var facet = $(target).attr('id');
            var facetOptions = options.facets.filter(function(f){
                return f.field === facet;
            })[0];

            var histogram_config = facetOptions.histogram_config;
            var barColor = histogram_config.bar_color || "#5393B4";

            var datasetR = dataset.map(function(item, index, arr){
                if(arr[index+1] !== undefined && item.x === arr[index+1].x){
                    var t = arr[index+1].y + item.y;
                    arr[index+1].y = t;
                    return null;
                } else {
                    if(item.color === undefined && item.extreme !== undefined){
                        item.color = barColor;
                    }
                    return item;
                }
            }).filter(Boolean);

            var $slider = $('#facetview_slider_' + rel, obj);
            var sliderHandle = $slider.slider("values");//  [min, max]
            var sliderV = $slider.data("all_values");
            if($slider.length === 0){
                sliderV = JSON.parse(sessionStorage.getItem(SLIDER_KEY + rel));
            }

            datasetR = datasetR.map(function(item){
                var smaller = parseFloat(item.from) > sliderV[ sliderHandle[1] ] ;
                var smaller = parseFloat(item.from) > sliderV[ sliderHandle[1] ] ;
                var larger = parseFloat(item.to) < sliderV[ sliderHandle[0] ];
                if( (smaller || larger) && (item.extreme === undefined) ){
                    if(item.color === undefined){
                        item.color = histogram_config.outside_slider_columns_color !== undefined ?
                            histogram_config.outside_slider_columns_color : "rgb(227, 228, 228)";
                    }
                }

                return item;
            });

            //inverting x to y
            var histoDataset = datasetR.map(function(item) {
                return { x: item.y, y: item.x, from: item.from, to: item.to, color: item.color, extreme: item.extreme };
            });

            var emptyDataset = false;

/*            if(histoDataset.length === 0){
                emptyDataset = true;
                //histoDataset.splice(-1,1);
            } else if( histoDataset[histoDataset.length - 1].x === 0 ){
                histoDataset.splice(-1,1);
            }*/

            var sliderWidth = $( "#facetview_slider_" + rel).width() - 2;
            var width = $( "#facetview_slider_" + rel).width();

            if( histogram_config.ratio ){
                histogramHeight = sliderWidth / histogram_config.ratio;
            } else if( histogram_config.container_height ){
                histogramHeight =  histogram_config.container_height;
            } else {
                histogramHeight = (sliderWidth / 1.77) / 2;
            }

            var padding = 1;

            // delete previous histogram and rerender
            $('#facetview_rangehistogramplaceholder_container'+ rel).html('');

            var svg = d3.select('#facetview_rangehistogramplaceholder_container'+ rel).append("svg")
                .attr("width", sliderWidth  )
                .attr("height", histogramHeight);

            var yScale = d3.scaleLinear()
                .domain([0, getMaxValue(histoDataset)])
                .range([2, histogramHeight]) // even a 0 will be represented so that we can have tooltip
                .nice();

            var tooltip = d3.select('#facetview_rangehistogramplaceholder_container'+ rel).append("div")
                .classed('histogram-tooltip', true)
                .classed('hidden', true);
            var datasetLength = histoDataset.length;
            var ds = datasetLength - 1 < 0 ? (datasetLength-1) : 0;

            var $slider = $('#facetview_slider_' + rel);

            /*histoDataset = histoDataset.map(function(item){
                // ignore first column if empty
                if(item.extreme === true) {
                    if(item.y === histoDataset[0].y ){
                        if(item.x === 0 ){
                            return null;
                        }
                        return item;
                    } else {
                        return item;
                    }
                } else {
                    return item;
                }
            }).filter(Boolean);*/


            svg.selectAll("rect")
                .data( histoDataset )
                .enter()
                .append("rect")
                    .attr("x", function(d, i) {
                        if(datasetLength % 2 === 0){
                            //return Math.floor(i * (colWidth ) + 4) + 4 ;
                        }
                        //return i * colWidth + 4;
                        //return Math.floor((i * colWidth ) + 2);
                        //return Math.abs(i * ((sliderWidth / datasetLength-1) + padding));
                        return i * ( ( width / histoDataset.length-1 ) + padding);
                    })
                    .attr("y", function(d) {
                        if(d.x === getMaxValue(histoDataset)){
                            return 0;
                        }
                        return histogramHeight - yScale(d.x);
                    })
                    .attr("width", function(d, i){

                        //return Math.floor( (sliderWidth) / ds - padding);
                        if(datasetLength % 2 === 0){
                            //return colWidth - 2;
                        }
                        //return colWidth - 2;
                        //return Math.abs(sliderWidth / datasetLength-1 - padding);
                        var res = Math.floor( width / histoDataset.length-1 - padding);
                        return res > 0 ? res : 1;
                    })

                    .attr("height", function(d) {
                        if(histoDataset.length === 0){
                            return 1;
                        }
                        if(d.x === 0 ){
                            return 0;
                        }
                        if(d.x === getMaxValue(histoDataset)){
                            return histogramHeight;
                        }
                        return yScale(d.x);
                    })

                    .style("fill", function(d){
                        if(d.color !== undefined){return d.color;}
                        return barColor;
                    })
                    .on("mouseover", function(d, i) {
                        tooltip.transition()
                            .duration(200);
                        tooltip.html( function(){
                                var from = d.from;
                                var to = d.to === null ? (+d.from) + intervalInput : d.to;

                                histogram_config.measurement_unit =  histogram_config.measurement_unit === null ? undefined : histogram_config.measurement_unit;

                                var mu = histogram_config.measurement_unit !== undefined ? histogram_config.measurement_unit : '';

                                if(from !== to){
                                    var resultHTML =  "<p><strong>" + from + " to " + to + "<br>" +  mu + "</strong></p>";
                                } else {
                                    var resultHTML =  "<p><strong>" + from + " " +  mu + "</strong></p>";
                                }


                                histogram_config.measurement_unit = ( histogram_config.measurement_unit === null) ? undefined : histogram_config.measurement_unit;


                                if( (histogram_config.show_results_in_tooltip === undefined || histogram_config.show_results_in_tooltip === true) ||
                                    histogram_config.show_results_in_tooltip === null){

                                    histogram_config.tooltip_results_name = (histogram_config.tooltip_results_name === null) ? undefined : histogram_config.tooltip_results_name;

                                    if(histogram_config.tooltip_results_name !== undefined  ) {
                                        resultHTML += "<p><span>" + d.x + " " + histogram_config.tooltip_results_name  + "</span></p>";
                                    } else {
                                        resultHTML += "<p><span>" + d.x + " items"  +"</span></p>";
                                    }
                                }
                                //resultHTML += JSON.stringify(d);
                                return resultHTML;
                        })
                        .classed('hidden', false)
                        .style("left", function() {
                            var leftO = (d3.event.pageX - $(d3.event.relatedTarget).offset().left) - $(this).width();
                            return leftO + "px";
                        })

                        .style("top", ( (d3.event.pageY - $(d3.event.relatedTarget).offset().top ) - $(this).height()/2) + "px" )
                        .style("z-index", 100);
                    })
                    .on("mouseout", function(d) {
                        tooltip.transition().duration(500);
                        tooltip.classed('hidden', true);
                    });

        }


        function renderSliderHistogram(rel, event, step, dataset, groupedDataset, intervalInput, sliderInterval, histogram_config,
                                   fromRefresh, refreshSlider ) {

            function findCloseValue(newval, vals, type, h_config){
                var mp = {
                    min: 0,
                    max: vals[vals.length-1]
                };
                var re = null;
                if(newval < vals[0] || newval > vals[vals.length-1]){
                    re = mp[type];
                } else /*if(newval > h_config.columns_bucket_max)*/{
                    re = vals.filter(function(item, index){
                        var hc = h_config;
                        var larger = newval >= item;
                        var smaller = newval < vals[index+1];
                        if(vals[index+1] === undefined){
                            smaller = true;
                        }
                        return smaller && larger;
                    });
                    if(re.length >= 1){
                        if(re[0] === vals[vals.length-1] && type === "min"){
                            re = vals[vals.length-1];
                        } else {
                            re = re[0];
                        }

                    }
                }
                return re;
            }

            function isInt(x) {
                if(x === ""){
                    return false;
                }
                return !isNaN(x) && eval(x).toString().length === parseInt(eval(x)).toString().length
            }

            function isFloat(x) {
                if(x===""){
                    return false;
                }
                return !isNaN(x) && !isInt(eval(x)) && x.toString().length > 0
            }

            if ($("[id='facetview_rangeplaceholder_" + rel + "']").length > 0) {
                $("[id='facetview_rangeplaceholder_" + rel + "']").remove();
            }

            var InitialResults = JSON.parse(sessionStorage.getItem(INITIAL_RESULTS_KEY) );

            if(InitialResults === null){
                dosearch();
            }
            var sessionData = parseresults(InitialResults);

            var valsFromSession = sessionData.facets[options.facets[rel].field];

            var filteredResults = {};
            $.each(Object.keys(valsFromSession) , function(k, v){
                if(v !== "undefined"){
                    var key = parseFloat(v);
                    filteredResults[key] = valsFromSession[key];
                }
            });

            var valsGroup = groupDatasetByIntervalWithExtremes( createValuesObj(filteredResults), intervalInput, histogram_config);

            var values = fillMissingValuesWithExtremes(intervalInput, sliderInterval, valsGroup, valsGroup, histogram_config);

            setValueInSessionStorage(SLIDER_KEY+rel, JSON.stringify(values));

            var exact_helper_class = '';
            if ($(event.target).hasClass('exact_helper')){
                exact_helper_class = 'exact_helper';
            }

            var muT = histogram_config.measurement_unit === null ? undefined : histogram_config.measurement_unit;
            var mu = muT === undefined ? "" : '<span class="um">' +  muT +  '</span>';

            var rangeselect = [
                '<div id="facetview_rangeplaceholder_',
                rel,
                '" class="facetview_facetrange_histogram facetview_rangecontainer clearfix ' + exact_helper_class + '" style="display:none;"> ',
                '<div class="clearfix">'

                +' <h3 id="facetview_rangechoices_',
                rel,
                '" style="margin-left:20px; margin-right:20px; float:left;border-bottom: 0; ',
                'clear:none; display: block;" class="clearfix"> <span ',
                'class="facetview_lowrangeval_',
                rel,
                '">...</span><input name="lowrangeval_'+ rel +'" class="disabled facetview_lowrangeval_'+ rel +'"  />',
                mu,
                //' <small>&nbsp;&nbsp;</small>',
                '<span class="facetview_highrangeval_',
                rel,
                '">...</span><input name="highrangeval_'+ rel +'" class="disabled text-right right facetview_highrangeval_'+ rel +'" /> </h3> ',
                '<div style="float:right;" ',
                'class="btn-group"> <a class="facetview_facetrange_remove ',
                'btn" rel="',
                rel,
                '" alt="remove" title="remove" href="#"><i ',
                'class="icon-remove hidden"> </i></a></div></div>',
                '<div id="facetview_rangehistogramplaceholder_container'+ rel +'" class="facetview_facetrange_histogram" style="margin:0 20px 0 20px;">',
                '<div id="facetview_rangehistogramplaceholder"',
                rel,
                ' ></div></div>',
                '<div ',
                'class="clearfix" style="margin:0 20px 20px 20px" id="facetview_slider_',
                rel,
                '" type="rangehistogram">' ,

                '</div> </div>'
            ].join('');

            $("[id='" + $(event.target).attr('id') + "']").after(rangeselect);
            $('.facetview_facetrange_remove[facettype="rangehistogram"]', obj)
                .unbind('click', clearfacetrangeHistogram);
            $('.facetview_facetrange_remove[facettype="rangehistogram"]', obj)
                .bind('click', clearfacetrangeHistogram);

            var valsobj = $('.facetview_tree[rel="'+$(event.target).attr('id')+'"]', obj);
            var facet = $(event.target).attr('id');

            var $slider = $('#facetview_slider_' + rel, obj);

            var minval = null;
            var maxval = null;
            for (var i = 0; i < options.facets.length; i++){
                if (options.facets[i].field === facet){
                    if (options.facets[i].default_values !== undefined){
                        minval = parseFloat(options.facets[i].default_values[0]);
                        maxval = parseFloat(options.facets[i].default_values[1]);
                    }
                }
            }

            /*if( sessionStorage.getItem(SLIDER_KEY + rel) !== null ){
                values = JSON.parse( sessionStorage.getItem(SLIDER_KEY + rel));
            } else {
                values = fillMissingValuesWithExtremes(intervalInput, sliderInterval, groupedDataset, dataset, histogram_config);
                setValueInSessionStorage(SLIDER_KEY + rel, JSON.stringify(values));
            }*/

            var min = 0;
            var max =  values.length - 1 ;

            for (var i = 0; i < values.length; i++){
                if (values[i] === minval){
                    min = i;
                }
                if (values[i] === maxval){
                    max = i;
                }
            }

            var facet = $(event.target).attr('id');
            min = Math.max(0, min);
            max = Math.min(values.length - 1, max);
            var facetOptions = options.facets.filter(function(f){
                return f.field === facet;
            })[0];

            var lowrangeText = $("#facetview_rangechoices_" + rel + " span.facetview_lowrangeval_" + rel, obj );
            var highrangeText = $('#facetview_rangechoices_' + rel + ' span.facetview_highrangeval_' + rel , obj);
            var lowrangeInput = $("#facetview_rangechoices_" + rel + " input.facetview_lowrangeval_" + rel, obj );
            var highrangeInput = $('#facetview_rangechoices_' + rel + ' input.facetview_highrangeval_' + rel , obj);
            var dec = (Number(sliderInterval) === sliderInterval && sliderInterval % 1 !== 0) ?  2 : 0 ;


            $slider.data("all_values", values);

            lowrangeText.hide();
            highrangeText.hide();

            $('#facetview_rangechoices_' +
                rel +
                ' span.facetview_lowrangeval_' +
                rel, obj
            ).html(values[min]);

            if(minval !== null && min !== minval){
                lowrangeInput.val(minval.toFixed(dec));
            } else if(fromRefresh){

                lowrangeInput.val(values[0].toFixed(dec));
            } else {
                lowrangeInput.val(values[min].toFixed(dec));
            }

            if(maxval !== null && max !== maxval  ){
                highrangeInput.val(maxval.toFixed(dec));
            } else if(fromRefresh){

                highrangeInput.val(values[values.length-1].toFixed(dec));
            } else {
                highrangeInput.val(values[max].toFixed(dec));
            }

            $('#facetview_rangechoices_' +
                rel +
                ' span.facetview_highrangeval_' +
                rel, obj
            ).html(values[max]);


            if(minval !== null && values[0] !== minval){
                min =  values.indexOf(findCloseValue(minval, values, "min",histogram_config));
            }

            if(maxval !== null && values[values.length - 1] !== maxval){
                max =  values.indexOf(findCloseValue(maxval, values, "max",histogram_config));
            }


            var detachedSlider = false;

            if(fromRefresh){
                min = 0;
                max = values[values.length-1];
            }

            var url_options = $.getUrlVars(options);

            if(url_options.source !== undefined &&
                (url_options.source.query.bool === undefined && url_options.source.query.function_score === undefined)
                ){

            } else {

                if( url_options.source.query.bool !== undefined &&  url_options.source.query.bool.must !== undefined ){
                    var qs =  url_options.source.query.bool.must;
                    $.each(qs, function(kq, q){

                        if( q.range !== undefined && q.range[ options.facets[rel].field ] ){
                            var from = parseFloat( q.range[ options.facets[rel].field ].from) ;
                            var to = parseFloat( q.range[ options.facets[rel].field ].to) ;

                            if($slider.length > 0){
                                var sliderVals = $slider.data("all_values") || JSON.parse( sessionStorage.getItem(SLIDER_KEY + rel)) ;

                                var fromI = sliderVals.findIndex(function(i){
                                    return i === from;
                                });
                                if(fromI === -1){
                                    fromI = sliderVals.findIndex( function(i){
                                        return i === findCloseValue(from, sliderVals, "min", null);
                                    });
                                }

                                var toI = sliderVals.findIndex(function(i){
                                    return i === to;
                                });
                                if(toI === -1){
                                    toI = sliderVals.findIndex( function(i){
                                        return i === findCloseValue(to, sliderVals, "max", null);
                                    });
                                }

                                lowrangeInput.val(from.toFixed(dec));
                                highrangeInput.val(to.toFixed(dec));

                                lowrangeText.html(from.toFixed(dec));
                                highrangeText.html(to.toFixed(dec));


                                min = fromI;
                                max = toI;
                            }
                        }
                    });

                } else {
                    var qs = url_options.source.query.function_score.query.bool.must;
                    var ops = options;
                    $.each(qs, function(kq, q){
                        var fac = options.facets[rel].field;
                        if( q.range !== undefined && q.range[fac] !== undefined ) {
                            var from = parseFloat( q.range[ fac ].from) ;
                            var to = parseFloat( q.range[ fac ].to) ;

                            if($slider.length > 0){
                                var sliderVals = $slider.data("all_values") || JSON.parse( sessionStorage.getItem(SLIDER_KEY + rel)) ;

                                var fromI = sliderVals.findIndex(function(i){
                                    return i === from;
                                });
                                if(fromI === -1){
                                    fromI = sliderVals.findIndex( function(i){
                                        return i === findCloseValue(from, sliderVals, "min", null);
                                    });
                                }

                                var toI = sliderVals.findIndex(function(i){
                                    return i === to;
                                });
                                if(toI === -1){
                                    toI = sliderVals.findIndex( function(i){
                                        return i === findCloseValue(to, sliderVals, "max", null);
                                    });
                                }

                                lowrangeInput.val(from.toFixed(dec));
                                highrangeInput.val(to.toFixed(dec));

                                lowrangeText.html(from.toFixed(dec));
                                highrangeText.html(to.toFixed(dec));

                                min = fromI;
                                max = toI;
                            }
                        }

                    });

                }
            }
            if(values[min] === values[0] && values[max] === values[values.length-1]) {

                delete options.facets[parseInt(rel)].default_values;
                $('a.facetview_filterselected[rel="' + rel + '"]').remove();
                $('#facetview_rangeresults_' + rel, obj).remove();
                $('#facetview_group_' + rel, obj).remove();
            }

            $('#facetview_slider_' + rel, obj).slider({
                range: true,
                min: 0,
                max: values.length - 1,
                values: [min, max],
                slide: function( eventS, ui ) {
                    if(detachedSlider === true){
                        detachedSlider = false;
                    } else {
                        if (ui.handle.nextSibling) {
                            // Moving LEFT slider ...
                            $('#facetview_rangechoices_' + rel + ' .facetview_lowrangeval_' + rel, obj).html( values[ ui.values[0] ].toFixed(dec) );
                            lowrangeInput.val( values[ ui.values[0] ].toFixed(dec)  );
                            highrangeText.html(highrangeInput.val());
                        } else {
                            // Moving RIGHT slider ...
                            $('#facetview_rangechoices_' + rel + ' .facetview_highrangeval_' + rel, obj).html( values[ ui.values[1] ].toFixed(dec) );
                            highrangeInput.val( values[ ui.values[1] ].toFixed(dec)  );
                            lowrangeText.html(lowrangeInput.val());
                        }
                    }
                    //$('#facetview_rangechoices_' + rel + ' .facetview_lowrangeval_' + rel, obj).html( values[ ui.values[0] ].toFixed(dec) );
                    //$('#facetview_rangechoices_' + rel + ' .facetview_highrangeval_' + rel, obj).html( values[ ui.values[1] ].toFixed(dec) );

                },
                change: function( eventS, ui ) {
                    if (ui === undefined){
                        return;
                    }
                    if(window.outerWidth < 1024){
                        $("#facetview_trees_loader").show("slow");
                    }

                    if(resetSlider[rel] !== undefined && resetSlider[rel] === true){
                        detachedSlider = true;

                        $('#facetview_rangechoices_' + rel + ' .facetview_lowrangeval_' + rel, obj).html( values[0].toFixed(dec)  );
                        $('#facetview_rangechoices_' + rel + ' .facetview_highrangeval_' + rel, obj).html( values[values.length-1].toFixed(dec)  );
                        lowrangeInput.val(values[0]);
                        highrangeInput.val(values[values.length-1]);

                        setTimeout(function(){
                            dofacetrangeHistogram( rel,true, histogram_config  );
                        }, 500);

                        resetSlider[rel] = false;
                    }
                    if(!detachedSlider){
                        lowrangeText.html(  values[ ui.values[0] ].toFixed(dec) );
                        highrangeText.html( values[ ui.values[1] ].toFixed(dec) );

                        if (ui.handle.nextSibling) {
                            // Moving LEFT slider ...
                            lowrangeInput.val(lowrangeText.html());
                            highrangeText.html(highrangeInput.val());
                            var chosenValues = {
                                min: values[ ui.values[0] ],
                                max: parseFloat(highrangeInput.val())
                            };
                        } else {
                            // Moving RIGHT slider ...
                            lowrangeText.html(lowrangeInput.val());
                            highrangeInput.val(highrangeText.html());
                            var chosenValues = {
                                min: parseFloat(lowrangeInput.val()),
                                max: values[ui.values[1]]
                            };
                        }
                        setTimeout(function(){
                            dofacetrangeHistogram( rel,true, histogram_config, chosenValues  );
                        }, 500);
                        detachedSlider = false;
                    }
                },
                stop: function(){

                },
                create: function(){

                }

            });

            lowrangeInput.on("click", function (e) {
                e.preventDefault();
                //detachedSlider = true;
                //lowrangeInput.val(lowrangeText.html());
                lowrangeInput.removeClass("disabled").focus();
            });

            lowrangeInput.on("focus", function (e) {
                e.preventDefault();
                //detachedSlider = true;
                lowrangeText.html(lowrangeInput.val());

                lowrangeInput.removeClass("disabled");
            });

            lowrangeInput.on("blur",{ histogram_config: histogram_config },  function(e){

                lowrangeInput.addClass("disabled");

                var newval = parseFloat($(e.target).val());
                var histogram_config = e.data.histogram_config || null;

                if( !isInt($(e.target).val()) && !isFloat($(e.target).val()) || $(e.target).val() === "" ){

                    newval = parseFloat(lowrangeText.html());
                    lowrangeInput.val(newval);
                } else {
                    if(newval > values[parseInt($slider.slider("values",1))]){
                        newval = parseFloat(lowrangeText.html());
                        lowrangeInput.val(newval);
                    } else {
                        lowrangeText.html(newval);

                        var re = findCloseValue(newval, values, "min",histogram_config );
                        var sliderPos = Object.keys(values).filter(function(key) {return values[key] === re})[0];
                        var chosenValues = {
                            min: newval,
                            max: highrangeInput.val()
                        };

                        $('.facetview_filterselected[facettype="rangehistorgam"]', obj).unbind('click', clearfacetrangeHistogram);
                        $('.facetview_filterselected[facettype="rangehistogram"]', obj).bind('click', clearfacetrangeHistogram);
                        setTimeout(function(){
                            dofacetrangeHistogram( rel,true, histogram_config, chosenValues );
                        }, 500);
                        detachedSlider = true;

                        if(sliderPos !== $slider.slider("values", 0) ) $slider.slider("values", 0, sliderPos);
                    }
                }

            });

            highrangeInput.on("click", function (e) {
                e.preventDefault();
                //detachedSlider = true;
                //highrangeInput.val(highrangeText.html());
                highrangeInput.removeClass("disabled").focus();
            });

            highrangeInput.on("focus",function(e){
                e.preventDefault();
                highrangeText.html(highrangeInput.val());
                //detachedSlider = true;
                highrangeInput.removeClass("disabled");
            });

            highrangeInput.on("blur",{ histogram_config: histogram_config }, function(e){
                var newval = parseFloat($(e.target).val());
                var histogram_config = e.data.histogram_config || null;

                highrangeInput.addClass("disabled");
                if( $(e.target).val() === "" || (!isInt($(e.target).val()) && !isFloat($(e.target).val())) ){
                    newval = parseFloat(highrangeText.html());
                    highrangeInput.val(newval);
                } else {
                    if(newval < values[parseInt($slider.slider("values",0))]  ){
                        newval =  parseFloat(highrangeText.html());
                        highrangeInput.val(newval);
                    } else {
                        highrangeText.html(newval);
                        var re = findCloseValue(newval, values, "max",histogram_config );
                        var chosenValues = {
                            min: lowrangeInput.val(),
                            max: newval
                        };
                        var sliderPos = Object.keys(values).filter(function(key) {return values[key] === re})[0];
                        /*$('.facetview_filterselected[facettype="rangehistogram"]', obj).unbind('click', clearfacetrangeHistogram);
                        $('.facetview_filterselected[facettype="rangehistogram"]', obj).bind('click', clearfacetrangeHistogram);*/
                        setTimeout(function(){
                            dofacetrangeHistogram( rel,true, histogram_config, chosenValues );
                        }, 500);

                        detachedSlider = true;

                        if(sliderPos !== $slider.slider("values", 1) ) $slider.slider("values", 1, sliderPos);
                    }
                }
            });

            $('.facetview_facetrange_remove[facettype="rangehistogram"]', obj)
                .unbind('click', clearfacetrangeHistogram);
            $('.facetview_facetrange_remove[facettype="rangehistogram"]', obj)
                .bind('click', clearfacetrangeHistogram);

        }

        // pass a list of filters to be displayed
        var buildfilters = function() {
            if (!options.facets.length) {
                return;
            }
            var filters = options.facets;

            //Create a jstree from the hierarchy, that will be populated
            //with the results
            var trees = $('#facetview_trees');

            var html = '';
            var orderConstants = {
                'term': {'count_class':'', 'count_icon':'eea-icon-sort-amount-asc', 'term_class': 'facetview_term', 'term_icon':'eea-icon-sort-alpha-asc'},
                'reverse_term' : {'count_class':'', 'count_icon':'eea-icon-sort-amount-asc', 'term_class': 'facetview_reverse_term', 'term_icon':'eea-icon-sort-alpha-desc'},
                'count' : {'count_class':'facetview_count', 'count_icon':'eea-icon-sort-amount-asc', 'term_class': '', 'term_icon':'eea-icon-sort-alpha-asc'},
                'reverse_count' : {'count_class':'facetview_reverse_count', 'count_icon':'eea-icon-sort-amount-desc', 'term_class': '', 'term_icon':'eea-icon-sort-alpha-asc'}};

            for (var prop in options.hierarchy) {
                if ((!options.enable_exact) && (prop.startsWith("items_count_"))){
                    continue;
                }
                var valuetext = '';
                var ord = '';
                var allow_exact = false;
                var autocomplete_placeholder = 'Search for value';
                var empty_message = 'No values to show';
                var short_name = 'Value';
                var autocomplete = false;
                for (var idx in filters) {
                    var facet = filters[idx];
                    if (facet.field === prop) {
                        valuetext = facet.display;
                        if ((facet.autocomplete_placeholder !== '') && (facet.autocomplete_placeholder !== undefined)){
                            autocomplete_placeholder = facet.autocomplete_placeholder;
                        }
                        if ((facet.empty_message !== '') && (facet.empty_message !== undefined)){
                            empty_message = facet.empty_message;
                        }
                        if ((facet.short_name !== '') && (facet.short_name !== undefined)){
                            short_name = facet.short_name;
                        }
                        ord = facet.order;
                        allow_exact = facet.allow_exact && options.enable_exact;
                        autocomplete = facet.autocomplete;
                        break;
                    }
                }
                if (ord === 'rterm'){ord = "reverse_term";}
                if (ord === 'rcount'){ord = "reverse_count";}
                var rel = facet.operator;
                if (rel === undefined) {
                    rel = 'AND';
                    facet.operator = 'AND';
                }
                var style = 'color:#aaa;';
                if ($('.facetview_logic_or[rel="' + prop + '"]').length) {
                    rel = 'OR';
                } else if (
                    $('.facetview_filterselected[rel="' + prop + '"]')
                        .length) {
                    rel = 'AND';
                }
                var ord = ord || 'term';
                var myOrder = orderConstants[ord];
                var eea_rel = "";
/*                    if ( options.enable_rangeselect ) {
                    range_btn = '<a class="btn btn-small facetview_facetrange" title="make a range selection on this filter" rel="' + idx + '" href="' + prop + '" style="color:#aaa;">range</a>';

                }*/


                var rel_text = 'all';
                var option_rel_all_selected = 'selected="selected"';
                var option_rel_any_selected = '';
                if (rel === 'OR'){
                    rel_text = 'any';
                    var option_rel_all_selected = '';
                    var option_rel_any_selected = 'selected="selected"';
                }
                var exact_html = '';
                if (allow_exact){
                    var checked_html = '';
                    var checked_class = 'eea-icon-square-o';
                    if (facet.is_exact){
                        checked_html = "checked='checked'";
                        checked_class = 'eea-icon-check-square-o';
                    }
                    exact_html =
                        '<div class="exact_facet_helper">'+
                            '<span class="eea-icon eea-icon-right eea-icon-question-circle eea-flexible-tooltip-top"'+
                                'title="The *Exact* option will give you results that contain exclusivly the selected values and nothing else. This option may give you more precise results. Try it to find out.">'+
                            '</span>'+
                            '<span>Exact:</span>'+
                            '<input type="checkbox" '+checked_html+'class="facetview_exact" href="' + prop + '"/>'+
                        '</div>';
                }

                var autocomplete_html = '';
                if (autocomplete){
                    autocomplete_html =
                        '<div class="facetview_filter_typeahead">'+
                            '<div>'+
                                '<span class="eea-icon eea-icon-search"></span>' +
                                '<input placeholder="' + autocomplete_placeholder + '" type="text" rel="' + prop +  '"/>' +
                            '</div>'+
                        '</div><div style="clear:both"></div>';
                }
                var empty_html = '<div class="facetview_filter_empty"><div><span class="eea-icon eea-icon-right eea-icon-exclamation-circle"></span>'+empty_message+'</div></div><div style="clear:both"></div>';
                var exact_helper_class = '';
                // startsWith needs polyfil for IE
                if (prop.startsWith("items_count_")){
                    exact_helper_class = 'exact_helper';
                }

                html = [html,
                        '<div class="facetview_filter"> <h2 ',
                        'class="facetview_showtree ' + exact_helper_class + '" title="',
                        valuetext,
                        '" id="',
                        prop,
                        '" eea_rel="',
                        idx,
                        '">',
                        '<div class="facetview_showtree_eealabel">',
                        valuetext,
                        '</div>',
                        '<span class="facetview_arrow_right"/> <div style="clear:both"> </div></h2> ',
                        autocomplete_html,
                        '<div class="btn-group facetview_filter_options" ',
                        'style="display:none;">',
                        '<div class="facet_order facet_count_order ' + myOrder['count_class'] + '">Count<span class="eea-icon ' + myOrder['count_icon'] + '"></span></div>',
                        '<div class="facet_order facet_value_order ' + myOrder['term_class'] + '">' + short_name + '<span class="eea-icon ' + myOrder['term_icon'] + '"></span></div>',
                        '<div class="facet_right_options">',
                        exact_html,
                        '<div class="facet_cond"><span>Match:</span> ',
                            '<a class="btn btn-small facetview_or"',
                                ' title="select another option from this filter" ',
                                'rel="',
                                rel,
                                '" href="',
                                prop,
                                '" >',
                                rel_text,
                            '</a>',
                        '</div>',


                        '<select class="facet_value_operator">',
                            '<option value="and"' + option_rel_all_selected + '>Match all</option>',
                            '<option value="or"' + option_rel_any_selected + '>Match any</option>',
                        '<select>',
                        '</div>',
                        '</div>',
                        empty_html,
                        '<div class="facetview_tree" style="display:none;',
                        ' border:solid #f0f0f0 1px; height:250px" rel="',
                        prop,
                        '"></div></div>'
                    ].join('');
                if ( options.enable_rangeselect ) {
                    html = [html
                            ];
                }

            }
            trees.append(html);


            for (var prop in options.hierarchy) {
                var tree = $('.facetview_tree[rel="' + prop + '"]');
                tree.closest(".facetview_filter").find(".facet_order").data("sortwhat", prop);
                var children = options.hierarchy[prop];
                var rel = facet.operator;
                var which = 0;
                for (var i = 0; i < options.facets.length; i++) {
                    var item = options.facets[i];
                    if ('field' in item) {
                        if (item.field === prop) {
                            which = i;
                        }
                    }
                }

                createtreefromdata(tree,
                                   options.facets[which].order,
                                   options.facets[which].facet_display_options,
                                   getJson(children, prop, rel));

                var autocomplete_input = $(".facetview_filter_typeahead input[rel='" + prop +"']", obj);
                if (autocomplete_input.autocompleteForFacet) {
                autocomplete_input.autocompleteForFacet(
                    {source:function(request, response){
                                var tree_prop = this.attr("rel");
                                dosuggestfacetvalues(tree_prop, request, response);
                            }.bind(autocomplete_input),
                        select:function(event, ui){
                        selectFromAutocomplete(event, ui.item.rel, ui.item.term);
                    }
                    });
                }
            }
            $('.facetview_exact', obj).bind('click', toggleexact);
            $('.facetview_filter_options .facet_order', obj).bind('click', function(ev) {
                sortfilters(ev);
            });
            $('.facet_value_operator', obj).bind("change", function(){
                $(this).closest(".facetview_filter_options").find(".facetview_or").trigger("click");
            });
            $('.facetview_or', obj).bind('click', orfilters);

            $('.facetview_showtree', obj).bind('click', showfiltervalues);
            if (options.description) {
                $('#facetview_trees', obj)
                    .append('<div>' + options.description + '</div>');
            }


            // make every facet resizable once when building the facets

            if(options.resizable && $.fn.resizable){
                $(".facetview_tree").each(function(idx, el) {
                    var $el = $(el);
                    var $parent;
                    if ($el.attr("rel").indexOf("items_count_") !== 0){
                        if (!$el.hasClass('ui-resizable')) {
                            $parent = $el.parent();
                            $parent.append(
                                '<div class="ui-resizable-handle ui-resizable-s">' +
                                '<div class="ui-icon ui-icon-grip-solid-horizontal"></div></div>');
                            $el.resizable({handles: { s: $parent.find('.ui-resizable-handle')}});
                        }
                    }
                });
            }
        };

        // trigger a search when a filter choice is clicked
        // or when a source param is found and passed on page load
        $.fn.facetview.clickfilterchoice = function(event, rel, href, initiator) {
            if (event) {
                event.preventDefault();
                var rel = $(this).attr('rel');
                var href = $(this).attr('href');
            }
            var relclean = rel.replace(/\./gi, '_').replace(/\:/gi, '_');

            // Do nothing if element already exists.
            if ($('a.facetview_filterselected[href="' + href +
                    '"][rel="' + rel + '"]').length) {
                return null;
            }


            var myobj = '<div class="facetview_selection"> <a ' +
                        'class="facetview_filterselected facetview_clear btn';
            var operation = $('.facetview_or[href="' + rel + '"]', obj);
            var op_text = 'all';
            if (operation.attr('rel') === 'OR' || initiator) {
                myobj += ' facetview_logic_or';
                op_text = 'any';
            }
            myobj = [myobj,
                     '" rel="',
                     rel,
                     '" alt="remove" title="remove" href="',
                     href,
                     '">',
                     ' <i class="icon-white icon-remove hidden"></i></a>',
                     href,
                     '</div>'
                    ].join('');

            if ($('div[id="facetview_group_' + relclean + '"]', obj).length) {
                myobj = '<a class="btn btn-small rel-between" rel="' + href +
                    '" style="color:#aaa">' + op_text + '</a>' + myobj;
                $('div[id="facetview_group_' + relclean + '"]', obj)
                    .append(myobj);
                if ($('.current-filters:hidden')) {
                    if (!options.hideCurrentFilters){
                        $('.current-filters').show();
                    }
                }

            } else {
                var title = options.facetnames ? options.facetnames[rel] : '';
                var pobj = [
                            '<div id="facetview_group_',
                            relclean,
                            '" class="btn-group facetview_selected">',
                            '<h3 class="facetview_group_title">',
                            title,
                            '<span> (in ',
                            op_text,
                            ')</span>',
                            '</h3>',
                            myobj,
                            '</div>'
                            ].join('');
                if ($('div.facetview_selected').length) {
                    pobj = '<div class="facet-rel-between"> <a class="btn ' +
                            'btn-small facet_operator"> AND</a></div>' + pobj;
                }

                //$('#facetview_selectedfilters', obj).append(pobj);

                $('#facetview_selected_filters', obj).append(pobj);

//                setfilterdescription("facetview_group_" + relclean, op_text);

                if ($('.current-filters:hidden')) {
                    if (!options.hideCurrentFilters){
                        $('.current-filters').show();
                    }
                }
            }

            $('.facetview_filterselected:not([facettype])', obj).unbind('click', clearfilter);
            $('.facetview_filterselected:not([facettype])', obj).bind('click', clearfilter);

            if (event) {
                dosearch();
            }
        };

        var clickfilterchoice = $.fn.facetview.clickfilterchoice;

        // clear a filter when clear button is pressed, and re-do the search
        $.fn.facetview.clearfilter = function(event, rel, that) {
            if (event){
                event.preventDefault();
                var that = $(this);
                var rel = that.attr('rel');
            }
            var display_opt = [];
            var length = options.facets.length;

            //in the case of a checkbox list, disable the checked option
            for (var i = 0; i < length; i++) {
                var item = options.facets[i];
                if ('field' in item && item.field === rel) {
                    display_opt = item.facet_display_options;
                }
            }
            var children_clicked;
            for (var opt in display_opt) {
                if (display_opt[opt] === 'checkbox') {
                    var box = $('li[rel="' + rel + '"][title="' +
                        that.attr('href') + '"]');
                    var children = box.children('.jstree-clicked')
                        .children('.jstree-checkbox');
                    if (children.length) {
                        children.trigger('click');
                        children_clicked = true;
                    }
                    break;
                }
            }

            var toDelete = that.parent();

            if (toDelete.siblings().length <= 1) {
                var parent = toDelete.parent();
                var facetrel = parent.next();

                if (!facetrel.length) {
                    facetrel = parent.prev();
                }
                facetrel.remove();
                parent.remove();
            } else {
                var button = toDelete.siblings('[rel="' + that.attr('href') + '"]');
                if (button.length === 0) {
                    $(toDelete.siblings('.rel-between')[0]).remove();
                } else {
                    button.remove();
                }
                toDelete.remove();
            }

            //if it was the last filter, hide header
            if ($('.facetview_selected').length === 0) {
                $('.current-filters').hide();
            }
            options.paging.from = 0;

            // when we click on facetview_selected_filters delete icon the clear
            // will trigger twice, once from the facet filter and second time from
            // this delete icon, as such perform the search only once in order to
            // have only one history entry
            if (event){
                if (event.target.className.indexOf('eea-icon-times') === -1 || !children_clicked) {
                    dosearch();
                }
            }

        };
        var clearfilter = $.fn.facetview.clearfilter;

        // ===============================================
        // functions to do with building results
        // ===============================================

        // returns an object for the facet, with values and their counts
        var parsefacet = function(facet) {
            var facetsobj = {};
            for (var thing = 0; thing < facet.terms.length; thing++) {
                facetsobj[facet.terms[thing].term] = facet.terms[thing].count;
            }
            if (options.add_undefined) {
                var undefCount = facet.missing;
                if (undefCount > 0) {
                    facetsobj.undefined = undefCount;
                }
            }
            return facetsobj;
        };

        // read the result object and return useful vals
        // returns an object that contains things like ["data"] and ["facets"]
        function parseresults (dataobj, cleanup) {
            var resultobj = {};
            resultobj.records = [];
            resultobj.start = '';
            resultobj.found = '';
            resultobj.facets = {};
            var temp, item_source, item_val;
            for (var item = 0; item < dataobj.hits.hits.length; item++) {
                if (options.fields) {
                    resultobj.records.push(dataobj.hits.hits[item].fields);
                } else if (options.partial_fields) {
                    var keys = [];
                    for (var key in options.partial_fields) {
                        keys.push(key);
                    }
                    resultobj.records.push(
                        dataobj.hits.hits[item].fields[keys[0]]);
                } else {
                    if (!cleanup) {
                        resultobj.records.push(dataobj.hits.hits[item]._source);
                    }
                    else {
                        item_source = dataobj.hits.hits[item]._source;
                        // 90612 remove html tags from string results when we render the results
                        for (var i in item_source) {
                           item_val = item_source[i];

                           if (typeof(item_val) === 'string') {
                               item_source[i] = item_val.replace(/(<([^>]+)>)/ig, "");
                           }
                        }
                        resultobj.records.push(item_source);
                    }
                    if (options.highlight_enabled){
                        if (dataobj.hits.hits[item].highlight !== undefined){
                            var tmp_resultobj = resultobj.records[resultobj.records.length - 1];
                            jQuery.each(dataobj.hits.hits[item].highlight, function(key, value){
                                var should_add = false;
                                if ((options.highlight_whitelist.indexOf(key) !== -1) || ((options.highlight_whitelist.length === 0) && (options.highlight_blacklist.length === 0))){
                                    should_add = true;
                                }
                                if (options.highlight_blacklist.indexOf(key) !== -1){
                                    should_add = false;
                                }
                                if (should_add){
                                    tmp_resultobj[key] = value;
                                }
                            });
                        }
                    }
                }
            }
            resultobj.start = '';
            resultobj.found = dataobj.hits.total;
            for (var item in dataobj.facets) {
                resultobj.facets[item] = parsefacet(dataobj.facets[item]);
            }
            return resultobj;
        }

        // decrement result set
        var decrement = function(event) {
            event.preventDefault();
            if ($(this).html() !== '..') {
                options.paging.from = options.paging.from - options.paging.size;
                if (options.paging.from < 0) {
                    options.paging.from = 0;
                }
                dosearch();
            }
        };
        // increment result set
        var increment = function(event) {
            event.preventDefault();
            if ($(this).html() !== '..') {
                options.paging.from = parseInt($(this).attr('href'));
                dosearch();
            }
        };

        // used to get value by dotted notation in result_display
        var getvalue = function(obj, dotted_notation) {
            if ((typeof(obj) === 'string') && (dotted_notation === '')){
              return obj;
            }
            var parts = dotted_notation.split('.');
            parts.reverse();
            var ref = [parts.pop()];
            while (parts.length && !(ref.join('.') in obj)) {
                ref.push(parts.pop());
            }
            var addressed_ob = obj[ref.join('.')];
            var left = parts.reverse().join('.');

            if (addressed_ob &&
                addressed_ob.constructor.toString().indexOf('Array') === -1) {
                if (parts.length) {
                    return getvalue(addressed_ob, left);
                }
                else {
                    return addressed_ob;
                }
            } else {
                if (addressed_ob !== undefined) {
                    var thevalue = [];
                    for (var row = 0; row < addressed_ob.length; row++) {
                        thevalue.push(getvalue(addressed_ob[row], left));
                    }
                    return thevalue.sort();
                } else {
                    return undefined;
                }
            }
        };

        // given a result record, build how it should look on the page
        var buildrecord = function(index) {
            var record = options.data.records[index];
            var result = options.resultwrap_start;
            // add first image where available
            if (options.display_images) {
                var recstr = JSON.stringify(record);
                var regex = /(http:\/\/\S+?\.(jpg|png|gif|jpeg))/;
                var img = regex.exec(recstr);
                if (img) {
                    result = [
                        result,
                        '<img class="thumbnail" style="float:left; ',
                        'width:100px; margin:0 5px 10px 0; ',
                        'max-height:150px;" src="',
                        img[0],
                        '" />'
                    ].join('');
                }
            }
            // add the record based on display template if available
            var display = options.result_display;
            var lines = '';
            var line;
            for (var lineitem = 0; lineitem < display.length; lineitem++) {
                line = '';
                for (var object = 0; object < display[lineitem].length;
                     object++) {
                    var thekey = display[lineitem][object]['field'];
                    var thevalue;
                    try {
                        thevalue = getvalue(record, thekey);
                    }
                    catch (err) {
                        thevalue = "";
                    }
                    if (thevalue && thevalue.toString().length) {
                        display[lineitem][object]['pre'] ?
                            line += display[lineitem][object]['pre'] : false;
                        // noinspection JSLint
                        if (typeof(thevalue) === 'object') {
                            for (var val = 0; val < thevalue.length; val++) {
                                val !== 0 ? line += ', ' : false;
                                line += thevalue[val];
                            }
                        } else {
                            // TODO clean
                            line += thevalue;
                        }
                        display[lineitem][object].post ?
                            line += display[lineitem][object].post :
                            line += ' ';
                    }
                    else {
                        display[lineitem][object]['pre'] ?
                            line += display[lineitem][object]['pre'] : false;
                        display[lineitem][object]['post'] ?
                            line += display[lineitem][object]['post'] : false;
                    }
                }
                if (line) {
                    lines += line.replace(/^\s/, '').replace(/\s$/, '')
                        .replace(/\,$/, '');
                }
            }
            lines ? result += lines : result += JSON.stringify(
                                                    record, '', '    ');
            result += options.resultwrap_end;
            return result;
        };

        //returns the number of results of the element's children
        var getValCount = function(element) {
            var result = 0;
            var nonrecursiveChildren = element.find('.facetview_filterchoice');
            for (var idx = 0; idx < nonrecursiveChildren.length; idx++) {
                var val = $(nonrecursiveChildren[idx]).text();
                var start = val.indexOf('(');
                var stop = val.indexOf(')');
                val = parseInt(val.substring(start + 1, stop)) || 0;
                result += val;
            }
            return result;
        };

        // view a full record when selected
        var viewrecord = function(event) {
            event.preventDefault();
            var record = options.data.records[$(this).attr('href')];
            window.alert(JSON.stringify(record, '', '    '));
        };

        //converts results to json
        var resultsToJson = function(results, property, rel) {
            var jsonval = [];
            if (rel === 'AND' || rel === 'OR') {
                for (var element in results) {
                    jsonval.push({'text' : '<span class="facet_label_count">'+ results[element] + '</span>' + '<span class="facet_label_text">' + element + '</span>',
                                  'li_attr' : {
                                        'rel' : property,
                                        'class' : 'facetview_filterchoice leaf',
                                        'title' : element
                                    }
                    });
                }
            } else {
                for (var element in results) {
                    jsonval.push({'text' : element,
                                  'li_attr' : {
                                        'rel' : property,
                                        'class' : 'facetview_filterchoice leaf v4',
                                        'title' : element
                                  }
                    });
                }
            }
            return jsonval;
        };

        var updateJson = function(results, property, json, rel) {

            var new_json = resultsToJson(results, property, rel);

            for (var element in json) {
                var value = json[element];
                for (var new_json_element in new_json) {
                    if (new_json[new_json_element].li_attr.title === json[element].li_attr.title){
                        new_json[new_json_element] = json[element];
                        value = new_json[new_json_element];
                    }
                }
                var text = value.li_attr.title;
                var result_val = results[text];
                if (result_val === undefined) {
                    value.text = '<span class="facet_label_count">0</span>' + '<span class="facet_label_text">' + text +'</span>';
                } else {
                    value.text = '<span class="facet_label_count">' + result_val + '</span>' + '<span class="facet_label_text">' + text + '</span>';
                }
            }
            return new_json;
        };

        var applyBlackAndWhiteListsOnFacetValues = function(records, whitelist, blacklist){
            var whitelisted_values = [];
            var all_values = Object.keys(records);
            var values = [];
            for (var v_idx = 0; v_idx < all_values.length; v_idx++){
                if (records[all_values[v_idx]] !== 0){
                    values.push(all_values[v_idx]);
                }
            }
            var values_length = values.length;
            var current_value;
            if ((whitelist !== undefined) && (whitelist.length > 0)){
                for (var value_idx = 0; value_idx < values_length; value_idx++){
                    current_value = values[value_idx];
                    if (whitelist.indexOf(current_value) > -1){
                        whitelisted_values.push(current_value);
                    }
                }
            }
            else {
                whitelisted_values = values;
            }

            var blacklisted_values = [];
            var w_value_length = whitelisted_values.length;
            var c_whitelisted_value;
            if ((blacklist !== undefined) && (blacklist.length > 0)){
                for (var wvalue_idx = 0; wvalue_idx < w_value_length; wvalue_idx++){
                    c_whitelisted_value = whitelisted_values[wvalue_idx];
                    if (blacklist.indexOf(c_whitelisted_value) === -1){
                        blacklisted_values.push(c_whitelisted_value);
                    }
                }
            }
            else {
                blacklisted_values = whitelisted_values;
            }
            var cleaned_results = {};
            var b_value_length = blacklisted_values.length;
            for (var bvalue_idx = 0; bvalue_idx < b_value_length; bvalue_idx++){
                cleaned_results[blacklisted_values[bvalue_idx]] = records[blacklisted_values[bvalue_idx]];
            }
            return cleaned_results;
        };

        var addValuesToTree = function(fn_options) {
            var fn_settings = {
                autocomplete: false,
                orRel: null,
                facetName: null,
                tree: null,
                records: null,
                order: null,
                doptions: null,
                size:0
            };
            $.extend(fn_settings, fn_options);

            var facet = fn_options.tree.attr("rel");
            var facet_length = eea_mapping.facets.length;
            var facet_whitelist = [];
            var facet_blacklist = [];
            var current_facet;
            for (var facet_idx = 0; facet_idx < facet_length; facet_idx++){
                current_facet = eea_mapping.facets[facet_idx];
                if (current_facet.name === facet){
                    var facet_size = current_facet.size;
                    facet_whitelist = current_facet.values_whitelist;
                    facet_blacklist = current_facet.values_blacklist;
                    break;
                }
            }
            var filteredRecords = applyBlackAndWhiteListsOnFacetValues(fn_settings.records, facet_whitelist, facet_blacklist);
            fn_settings.tree.data("values_count", Object.keys(filteredRecords).length);
            var facet_obj = fn_settings.tree.closest(".facetview_filter");
            if (Object.keys(filteredRecords).length === 0){
                $('.facet_order', facet_obj).hide();
                $('.facetview_filter_typeahead div', facet_obj).hide();
                $('.facetview_filter_empty div', facet_obj).show();
            }
            else {
                $('.facet_order', facet_obj).show();
                $('.facetview_filter_typeahead div', facet_obj).show();
                $('.facetview_filter_empty div', facet_obj).hide();
            }
            fn_settings.tree.data("records", $.extend(true, {}, filteredRecords));
/*            if (Object.keys(filteredRecords).length > fn_settings.size){
                var selectedFacetItems = $(".facetview_selected a[rel='" + facet + "']")
                var selectedFacetValues = [];
                $.each(selectedFacetItems, function(idx, item){
                    selectedFacetValues.push($(item).closest("div").text().trim());
                });
                if (selectedFacetValues.length === 0){
                    $('.facet_order', facet_obj).hide();
                }
                if (fn_settings.autocomplete){
                    $.each(filteredRecords, function(key, value){
                        if ($.inArray(key.trim(), selectedFacetValues) === -1){
                            delete(filteredRecords[key]);
                        }
                    });
                }
            }*/
            if ((!options.enable_exact) && (fn_settings.facetName.startsWith("items_count_"))){
                return;
            }
            var values;
            if (options.hierarchy && options.hierarchy[fn_settings.facetName].length) {
                //set the values for the leaves
                for (var item in filteredRecords) {
                    var record = filteredRecords[item];
                    var inTree = fn_settings.tree.find('.jstree-leaf[title="' + item + '"]');

                    if (inTree.length > 0) {
                        fn_settings.tree.jstree(true).rename_node(
                            inTree, '<span class="facet_label_count">' + record + '</span>' + '<span class="facet_label_text">' + item + '</span>');
                    }
                }

                //hide the ones with no values
                values = $('.jstree-node[rel="' + fn_settings.facetName + '"]');
                for (var id = 0; id < values.length; id++) {
                    var value = values[id];
                    if (filteredRecords[value.title] === undefined) {
                        $(value).hide();
                    }
                }
            } else {
                var oldJson = fn_settings.tree.jstree ? fn_settings.tree.jstree(true) : "";
                    oldJson = oldJson ? oldJson.get_json('#') : oldJson;
                if (fn_settings.tree.jstree) {
                    fn_settings.tree.jstree('destroy');
                }
                if (oldJson.length === 0) {
                    createtreefromdata(
                        fn_settings.tree,
                        fn_settings.order,
                        fn_settings.doptions,
                        resultsToJson(filteredRecords, fn_settings.facetName, fn_settings.orRel)
                    );
                } else {
                    createtreefromdata(
                        fn_settings.tree,
                        fn_settings.order,
                        fn_settings.doptions,
                        updateJson(filteredRecords, fn_settings.facetName, oldJson, fn_settings.orRel)
                    );
                    var children = fn_settings.tree.find('.jstree-leaf');
                    children.show();
                }
            }

            // Expand tree to desired height
            var ulTree = fn_settings.tree.find('.jstree-container-ul')[0];
            var lineHeight = 24;
            var childCount = ulTree ? ulTree.childElementCount : 0;
            var prefHeight = childCount >= 10 ? 10 * lineHeight : childCount * lineHeight;
            fn_settings.tree.height(prefHeight + 'px');
        };

        //put facet values for an 'OR' facet
        // noinspection JSLint
        var setFacetValues = function(sdata) {
            var facet = Object.keys(sdata.facets)[0];
            var tree = $('.facetview_tree[rel="' + facet + '"]');
            //todo, see if can be better, check parseresults
            var records = parsefacet(sdata.facets[facet]);
            var order = 'term';
            var doptions = [];
            //Get facet order and options
            var facets = options.facets;
            var size = 100;
            var autocomplete = false;
            for (var fct in facets) {
                var curr_fct = facets[fct];
                if(curr_fct.field === facet) {
                    order = curr_fct.order;
                    doptions = curr_fct.facet_display_options;
                    size = curr_fct.size;
                    autocomplete = curr_fct.autocomplete;
                    break;
                }
            }
            addValuesToTree({
                orRel: 'OR',
                facetName: facet,
                tree: tree,
                records: records,
                order: order,
                doptions: doptions,
                size: size,
                autocomplete: autocomplete
            });
        };

        var correctFacetRenderer = function(data , trees, options){
            // check the facet values if they are not checked already
            var $selected_facetvalues = $("#facetview_selected_filters").find('.facetview_filterselected').filter(':not([facettype])');
            $selected_facetvalues.each(function(idx, selected_facetvalue){
                var $el = $(selected_facetvalue);
                var facet_id = $el.attr("rel");
                var facet_val = $el.attr("href");
                var $facet = $("h2").filter("[id='"+facet_id+"']").closest(".facetview_filter");
                var $facet_tree = $facet.find(".facetview_tree");
                var $selected_tree_value = $facet_tree.find("li").filter("[title='"+facet_val+"']");
                var $selected_tree_value_anchor;
                if ($selected_tree_value.length) {
                    $selected_tree_value_anchor = $selected_tree_value.find(".jstree-anchor");
                    if (!$selected_tree_value_anchor.hasClass("jstree-clicked")) {
                        $selected_tree_value.find(".jstree-checkbox").click();
                    }
                }
            });

            if(trees !== undefined && options !== undefined){
                correctHistrogramFacetRenderer(data, trees, options);
            }
        };

        var correctHistrogramFacetRenderer = function(data, trees, options){
            //refresh each histogram filter

            var filters = options.facets.filter(function(item){
                return item.type === "rangehistogram";
            });

            $.each( filters,function(k, hfilter){
                if(hfilter.type !== "rangehistogram"){
                    return true;
                }

                var rel = options.facets.findIndex(function(el, index, arr){
                    return el.field === hfilter.field;
                });

                var otherFilters = filters.filter(function(item){
                    return item.field !== hfilter.field;
                });
                var otherRel = otherFilters.map(function(elem, index, arr){
                    return options.facets.findIndex(function(el, index, arr){
                        return elem.field === el.field;
                    });
                });

                var $slider = $('#facetview_slider_' + rel);

                var el = $slider.parent().parent().find("h2")[0];
                var that = $(el);
                var event = null;
                var step = hfilter.histogram_config.columns_bucketsize;


                if( el && $(el).length > 0){
                    var step = options.step || 1;
                    var target = that.closest(".facetview_filter").find(".facetview_showtree");
                    var event = {
                        target : target,
                        preventDefault: function(){}
                    };
                    var valsobj = $('.facetview_tree[rel="'+$(el).attr('id')+'"]', obj);

                    $('#facetview_rangehistogramplaceholder_container'+rel + ' svg').find("rect").remove();

                    refreshHistogram(data, el, rel);

                    if ($(target).attr("id").indexOf("items_count_") !== 0){
                        that.parent().find(".facetview_rangecontainer").slideDown('fast');
                    }
                }


            });
        };

        var refreshHistogram = function(data, el, rel){
            var facet = options.facets[rel];
            var histogram_config = facet.histogram_config;
            var intervalInput = histogram_config.columns_bucketsize || 10;
            var sliderInterval = histogram_config.slider_bucketsize || 2;

            var $slider = $('#facetview_slider_' + rel);
            var sliderH = $slider.slider("values");

            var sliderV = null;

            sliderV = $slider.data("all_values");

            var valsobj = $('.facetview_tree[rel="'+facet.field+'"]');

            var datasetFilledMissing = createValuesObj(valsobj.data("group_values"));

            var datasetGroupByIntervalOLD = [];

            if( sessionStorage.getItem(GROUPS_KEY + rel) !== null){
                var groupFromSession = JSON.parse( sessionStorage.getItem(GROUPS_KEY + rel) );

                datasetGroupByIntervalOLD = populateEmptyGroupFromNewData(groupFromSession, datasetFilledMissing);

            } else {
                var InitialResults = JSON.parse(sessionStorage.getItem(INITIAL_RESULTS_KEY) );

                if(InitialResults === null){
                    dosearch();
                }
                var sessionData = parseresults(InitialResults);

                var valsFromSession = sessionData.facets[options.facets[rel].field];

                var filteredResults = {};
                $.each(Object.keys(valsFromSession) , function(k, v){
                    if(v !== "undefined"){
                        var key = parseFloat(v);
                        filteredResults[key] = valsFromSession[key];
                    }
                });

                var emptyDatasetGroupByInterval = groupDatasetByIntervalWithExtremes( createValuesObj(filteredResults), intervalInput, histogram_config)
                    .map(function(item){
                        item.y = 0;
                        return item;
                    });

                datasetGroupByIntervalOLD = populateEmptyGroupFromNewData(emptyDatasetGroupByInterval, datasetFilledMissing);
            }

            var datasetGroupByInterval = datasetGroupByIntervalOLD.map(function(item){
                var smaller = parseFloat(item.from) > sliderV[ sliderH[1] ] ;
                var larger = parseFloat(item.to) < sliderV[ sliderH[0] ];
                if((smaller || larger)  ){
                    item.color = histogram_config.outside_slider_columns_color !== undefined ? histogram_config.outside_slider_columns_color :
                        "rgb(227, 228, 228)";
                }
                return item;
            });


            if( sliderH[0] === 0 && (sliderH[1] === sliderV.length-1) ) {
                delete options.facets[parseInt(rel)].default_values;
                $('a.facetview_filterselected[rel="' + rel + '"]').remove();
                $('#facetview_rangeresults_' + rel, obj).remove();
                $('#facetview_group_' + rel, obj).remove();

                if ($('.facetview_selected').length === 0) {
                    $('.current-filters').hide("fast");
                }
            }

            var event = {
                target: el,
                preventDefault: function(){}
            };

            if(typeof rel === "number") rel = rel.toFixed(0);

            var target = event.target;

            //$('#facetview_rangehistogramplaceholder_container'+ rel).html('');
            //$('#facetview_rangehistogramplaceholder_container'+rel + ' svg').find("rect").fadeOut('slow',function(){

            //}).fadeIn("slow");

            if(histogram_config.histogram === undefined || histogram_config.histogram !== false  ){
                setTimeout(function(){
                    // used setTimout to allow DOM to create the slider
                    // we need it to determine the width of the histogram
                    renderHistogram(rel, datasetGroupByInterval, intervalInput, target, sliderInterval, true);
                    //renderHistogramCanvas(rel, datasetGroupByInterval, intervalInput, event, sliderInterval);
                });
                $(window).on('resize', function(){
                    renderHistogram(rel, datasetGroupByInterval, intervalInput, target, sliderInterval, true);
                    //renderHistogramCanvas(rel, datasetGroupByInterval, intervalInput, event, sliderInterval);

                });
            }
        };

        var getAllKeys = function(keys_list, es_query){
            $.each(es_query, function(key, value) {
                if ($.inArray(key, keys_list) === -1){
                    keys_list.push(key);
                }
                if (typeof(value) === 'object'){
                    getAllKeys(keys_list, value);
                }
            });
        };

        var addDecayFunction = function(es_query, type, fct){
            if (es_query.query[options.query_type].functions === undefined){
                es_query.query[options.query_type].functions = [];
            }
            if (options.relevance.score_mode !== undefined){
                es_query.query[options.query_type].score_mode=options.relevance.score_mode;
            }
            if (options.relevance.boost_mode !== undefined){
                es_query.query[options.query_type].boost_mode=options.relevance.boost_mode;
            }
            var new_func = {};
            new_func[type] = fct;
            es_query.query[options.query_type].functions.push(new_func);
        };

        var addDecayFunctions = function(es_query){
            if (settings_relevance_enabled){
                if (!$.isEmptyObject(options.relevance)){
                    if (options.relevance.functions !== undefined){
                        $.each(options.relevance.functions, function(key, value) {
                            addDecayFunction(es_query, key, value);
                        });
                    }
                    if (options.relevance.facet_decay_functions !== undefined){
                        var query_keys_list = [];
                        getAllKeys(query_keys_list, es_query);
                        $.each(options.relevance.facet_decay_functions, function(key, value) {
                            if ($.inArray(key, query_keys_list) !== -1){
                                $.each(value, function(facet_fct_key, facet_fct_value) {
                                    addDecayFunction(es_query, facet_fct_key, facet_fct_value);
                                });
                            }
                        });
                    }
                }
            }
            return (es_query);
        };

        var shr = 0;
        // put the results on the page
        var showresults = function(sdata) {

            options.rawdata = sdata;
            // get the data and parse from the es layout
            var fields_in_use = eea_mapping.listing;
            if (options.display_type === 'card'){
                fields_in_use = eea_mapping.card;
            }
            if (options.display_type === 'list'){
                fields_in_use = eea_mapping.list;
            }
            var data = parseresults(sdata, true);


            for (var record_count = 0; record_count < data.records.length; record_count++){
                var record = data.records[record_count];
                for (var field_count = 0; field_count < fields_in_use.length; field_count++){
                    var field_whitelist = fields_in_use[field_count].values_whitelist;
                    var field_name = fields_in_use[field_count].name;
                    if (field_whitelist !== undefined){
                        var field_values = record[field_name];
                        var new_data = [];
                        if (!$.isArray(field_values)){
                            field_values = [field_values];
                        }
                        for (var value_count = 0; value_count < field_values.length; value_count++){
                            if (field_whitelist.indexOf(field_values[value_count]) !== -1){
                                new_data.push(field_values[value_count]);
                            }
                        }
                        record[field_name] = new_data;
                    }

                    var field_blacklist = fields_in_use[field_count].values_blacklist;
                    if (field_blacklist !== undefined){
                        var field_values = record[field_name];
                        var new_data = [];
                        if (!$.isArray(field_values)){
                            field_values = [field_values];
                        }
                        for (var value_count = 0; value_count < field_values.length; value_count++){
                            if (field_blacklist.indexOf(field_values[value_count]) === -1){
                                new_data.push(field_values[value_count]);
                            }
                        }
                        record[field_name] = new_data;
                    }

                    if ((fields_in_use[field_count].type === "date") && (fields_in_use[field_count].format !== undefined)){
                        if ($.datepicker) {
                            record[field_name] = $.datepicker.formatDate('dd M yy', new Date(record[field_name]));
                        }
                    }
                }
            }
            options.data = data;

            var choices = $('.facetview_filterchoice');
            for (var choice = 0; choice < choices.length; choice++) {
                var current = $(choices[choice]);
                current.text(current.attr('href'));
                current.parent().hide();
            }
            var open = $('.jstree-open');

            // for each filter setup, find the results for it and append them
            //to the relevant filter
            for (var each = 0; each < options.facets.length; each++) {
                var current_filter = options.facets[each];

                var facet = current_filter.field;
                var facetclean = current_filter.field
                                .replace(/\./gi, '_').replace(/\:/gi, '_');
                var records = data.facets[facet];
                var tree = $('.facetview_tree[rel="' + facet + '"]');
                var or_button = tree
                        .siblings('.facetview_filter_options')
                            .find('.facetview_or');
                var or_button_rel = or_button.attr('rel');

                if( $.inArray(facet, options.rangehistogramfacets) !== -1 ){

                    var esquery = JSON.parse(elasticsearchquery());
                    var newQuery = {};
                    $.extend(newQuery, esquery);

                    //copy query
                    //var newerQ = JSON.parse(JSON.stringify(newQuery));
                    //newerQ.facets = {};
                    //newerQ.facets[facet] = esquery.facets[facet];

                    //newQuery.query = {"match_all":{}};
                    var query_base = newQuery;

                    if (newQuery.query.function_score !== undefined) {
                        query_base = newQuery.query.function_score;
                    }
                    if ((query_base.query.bool !== undefined) && (query_base.query.bool.must !== undefined)){
                        var newMust = [];
                        for (var i = 0; i < query_base.query.bool.must.length; i++){
                            if ((query_base.query.bool.must[i].range !== undefined) && (query_base.query.bool.must[i].range[facet] !== undefined)){

                                //delete(query_base.query.bool.must[i]);
                                //delete(query_base.query.bool.must[i].range);
                            } else {
                                newMust.push(query_base.query.bool.must[i]);
                            }
                        }
                        query_base.query.bool.must = newMust;

                    }

                    newQuery.facets = {};
                    newQuery.facets[facet] = esquery.facets[facet];

                    newQuery = JSON.stringify(newQuery);


                    function parseRangeHistogramFacetValues(sdata){
                        var refreshOptions = sdata.refreshOptions;
                        delete  sdata.refreshOptions;

                        var data;
                        if (!sdata.skipParser){
                            data = parseresults(sdata);
                        }
                        else{
                            data = sdata;
                        }
                        var tmp_facet;
                        for (var key in data.facets) {
                            tmp_facet = key;
                        }
                        var rangevalues = [];
                        var rangegroups = [];

                        for ( var item in data.facets[tmp_facet] ) {
                            if (!isNaN(item)){
                                rangevalues.push(parseFloat(item));
                                rangegroups[item] = data.facets[tmp_facet][item];
                            }
                        }

                        rangevalues = rangevalues.sort(sortNumber);

                        var tree = $('.facetview_tree[rel="' + tmp_facet + '"]');
                        tree
                            .addClass("hasData")
                            .data("values", rangevalues)
                            .data("group_values", rangegroups);


                        if (tree.jstree) {
                            tree.jstree('destroy');
                        }
                        createtreefromdata(
                            tree,
                            "term",
                            ["checkbox"],
                            resultsToJson([0,1], tmp_facet, 'OR'));

                        var $header = tree.parent().find('h2').filter("[id='" + tmp_facet + "']");
                        var header_class = $header.attr('class');
                        if (header_class.indexOf('facetview_open') === -1 && header_class.indexOf('exact_helper') === -1 && $("#landing").css('display') !== "block") {
                            $header.click();
                        }

                        correctFacetRenderer(sdata, tree, options,refreshOptions );

                    }

                    var refresh = current_filter.type === "rangehistogram";
                    var parseOptions = {};
                    if(refresh){
                        parseOptions = {
                            refresh: refresh,
                            currentFilter: current_filter,
                            facet: facet,
                            filters: options.facets,
                            rel: rel,
                            q: JSON.parse(newQuery),

                            //query: newerQ
                        };
                    }

                    if (facet.indexOf("items_count") !== 0){
                        $.ajax({
                            type: 'get',
                            url: options.search_url,
                            data: {source: removedisplaytype(newQuery)},
                            dataType: options.datatype,
                            success:function(d){
                                d.refreshOptions = parseOptions;
                                parseRangeHistogramFacetValues(d);
                            },
                            error: function(){

                            }
                        });
                    }
                    else {
                        var items_count_sdata = {facets:{}};
                        items_count_sdata.facets[facet] = {};
                        for (var it_cnt = 1; it_cnt < 100; it_cnt ++){
                            items_count_sdata.facets[facet][it_cnt] = 1;
                        }
                        items_count_sdata.skipParser = true;
                        items_count_sdata.refreshOptions = parseOptions;
                        items_count_sdata.query = newerQ;

                        parseRangeHistogramFacetValues(items_count_sdata);
                    }


                }

                if ($.inArray(facet, options.rangefacets) !== -1 ){
                    var esquery = JSON.parse(elasticsearchquery());
                    var newQuery = {};
                    $.extend(newQuery, esquery);
                    newQuery.query = {"match_all":{}};
                    newQuery.facets = {};
                    newQuery.facets[facet] = esquery.facets[facet];
                    newQuery = JSON.stringify(newQuery);

                    function parseRangeFacetValues(sdata){
                        var data;
                        if (!sdata.skipParser){
                            data = parseresults(sdata);
                        }
                        else{
                            data = sdata;
                        }
                        var tmp_facet;
                        for (var key in data.facets) {
                            tmp_facet = key;
                        }
                        var rangevalues = [];
                        var rangegroups = [];


                        for ( var item in data.facets[tmp_facet] ) {
                            if (!isNaN(item)){
                                rangevalues.push(parseFloat(item));
                            }
                        }

                        rangevalues = rangevalues.sort(sortNumber);

                        var tree = $('.facetview_tree[rel="' + tmp_facet + '"]');
                        tree
                            .addClass("hasData")
                            .data("values", rangevalues);
                            if (tree.jstree) {
                                tree.jstree('destroy');
                            }
                        createtreefromdata(
                            tree,
                            "term",
                            ["checkbox"],
                            resultsToJson([0,1], tmp_facet, 'OR'));

                        var $header = tree.parent().find('h2').filter("[id='" + tmp_facet + "']");
                        var header_class = $header.attr('class');
                        if (header_class.indexOf('facetview_open') === -1 && header_class.indexOf('exact_helper') === -1 && $("#landing").css('display') !== "block") {
                           $header.click();
                        }
                        correctFacetRenderer();
                    }


                    if (facet.indexOf("items_count") !== 0){
                        $.ajax({
                            type: 'get',
                            url: options.search_url,
                            data: {source: removedisplaytype(newQuery)},
                            dataType: options.datatype,
                            success: parseRangeFacetValues
                        });
                    }
                    else {
                        var items_count_sdata = {facets:{}};
                        items_count_sdata.facets[facet] = {};
                        for (var it_cnt = 1; it_cnt < 100; it_cnt ++){
                            items_count_sdata.facets[facet][it_cnt] = 1;
                        }
                        items_count_sdata.skipParser = true;
                        parseRangeFacetValues(items_count_sdata);
                    }

                }
                if (or_button_rel === 'OR') {
                    //query ES to get results without current facet options
                    var esquery = JSON.parse(elasticsearchquery());
                    var filters = esquery.query[options.query_type];
                    if (!filters) {
                        addValuesToTree({
                            orRel: 'OR',
                            facetName: facet,
                            tree: tree,
                            records: records,
                            order: current_filter.order,
                            doptions: current_filter.facet_display_options,
                            size: current_filter.size,
                            autocomplete: current_filter.autocomplete
                        });

                    } else {
                        var newQuery = {'query': filters.query};
                        filters = filters.filter;

                        if ('and' in filters) {
                            var and = filters.and;
                            var newand = [];
                            for (var aval in and) {
                                var filter = and[aval].bool.should;
                                var newfilter = [];
                                for (var flt in filter) {
                                    var currflt = filter[flt];
                                    if ((currflt.term !== undefined) && (facet in currflt.term)) {
                                        continue;
                                    }
                                    newfilter.push(currflt);
                                }
                                if (newfilter.length > 0) {
                                    newand.push({'bool': {'should': newfilter}});
                                }
                            }
                            if (newand.length > 1) {
                                filters.and = newand;
                            } else {
                                filters = newand[0];
                            }
                        } else {
                            filters.bool = filters.bool || {};
                            var filter = filters.bool.should || [];
                            var newfilter = [];
                            for (var flt in filter) {
                                var currflt = filter[flt];
                                if (currflt.term && facet in currflt.term) {
                                    continue;
                                }
                                newfilter.push(currflt);
                            }
                            if (newfilter.length === 0) {
                                filters = {};
                            } else {
                                filters.bool.should = newfilter;
                            }
                        }
                        if ('bool' in filters || 'and' in filters) {
                            var tmp_newQuery = {};
                            $.extend(true, tmp_newQuery, newQuery);
                            newQuery = {'query':{}};
                            newQuery.query[options.query_type] = {'query': tmp_newQuery.query, 'filter': filters};
                            newQuery = addDecayFunctions(newQuery);
                        }
                        newQuery.facets = {};
                        newQuery.facets[facet] = esquery.facets[facet];
                        newQuery = JSON.stringify(newQuery);
                        //Ajax call
                        if (facet.indexOf("items_count") !== 0){
                            $.ajax({
                                type: 'get',
                                url: options.search_url,
                                data: {source: removedisplaytype(newQuery)},
                                dataType: options.datatype,
                                success: setFacetValues
                            });
                        }
                        else {
                            var items_count_sdata = {facets:{}};
                            items_count_sdata.facets[facet] = {terms:[]};
                            for (var it_cnt = 1; it_cnt < 100; it_cnt ++){
                                items_count_sdata.facets[facet].terms.push({term:it_cnt, count:1});
                            }
                            setFacetValues(items_count_sdata);
                        }
                    }

                } else {
                    addValuesToTree({
                        orRel: 'AND',
                        facetName: facet,
                        tree: tree,
                        records: records,
                        order: current_filter.order,
                        doptions:  current_filter.facet_display_options,
                        size: current_filter.size,
                        autocomplete: current_filter.autocomplete
                    });
                }

                //hide hierarchic parents with no results
                if (options.hierarchy) {
                    var parents = $('.facetview_filterparent');
                    for (var idx = 0; idx < parents.length; idx++) {
                        var parent = $(parents[idx]);
                        var text = parent.text();
                        var rel = parent.attr('rel');
                        var start = text.indexOf('(');
                        var stop = text.indexOf(')');
                        text = parseInt(text.substring(start + 1, stop)) || 0;
                        if (text === 0) {
                            $(parents[idx]).parent().hide();
                        } else {
                            $(parents[idx]).parent().show();
                        }
                    }
                }
            }

            if (options.isInitialSearch){

                //clear sessionStorage
                Object.keys(sessionStorage).map(function(key){
                   if(key.indexOf(GROUPS_KEY) !== -1 || key.indexOf(SLIDER_KEY) !== -1){
                       sessionStorage.removeItem(key);
                   }

                });

                var facets_changed = false;
                options.applyingDefaults = true;
                for (var i = 0; i < options.facets.length; i++){
                    if (options.facets[i].default_values !== undefined){
                        var default_facet_title = options.facets[i].display;
                        var default_facet_operator = options.facets[i].default_values.operator || "or";
                        //check operator button, and click if necessary
                        var default_facet = $("h2[title='"+default_facet_title+"']").closest(".facetview_filter");
                        var operator_button = default_facet.find(".facet_cond").find("a");
                        if (operator_button.length && operator_button.attr("rel").toLowerCase() !== default_facet_operator){
                            operator_button.click();
                        }
                        //set the default values
                        for (var j = 0; j < options.facets[i].default_values.values.length; j++){
                            default_facet.find(".facetview_tree").find("li[title='"+options.facets[i].default_values.values[j]+"']").find(".jstree-checkbox").click();
                            facets_changed = true;
                        }
                    }
                }
                if (facets_changed){
                    options.applyingDefaults = false;
                    dosearch();
                    options.isInitialSearch = false;
                    return;
                }
                options.applyingDefaults = false;
                options.isInitialSearch = false;
            }
            options.isInitialSearch = false;
            // put result metadata on the page
            if (typeof(options.paging.from) !== 'number') {
                options.paging.from = parseInt(options.paging.from);
            }
            if (typeof(options.paging.size) !== 'number') {
                options.paging.size = parseInt(options.paging.size);
            }
            if (options.pager_slider) {
                var metaTmpl = [
                    '<div style="font-size:20px;font-weight:bold;margin:5px 0',
                    ' 10px 0;padding:5px 0 5px 0;border:1px solid #eee;',
                    'border-radius:5px;-moz-border-radius:5px;',
                    '-webkit-border-radius:5px;">',
                    '<a alt="previous" title="previous" ',
                    'class="facetview_decrement" style="color:#333;float:left;',
                    'padding:0 40px 20px 20px;" href="{{from}}">&lt;</a> ',
                    '<span style="margin:30%;">{{from}} &ndash; {{to}} of ',
                    '{{total}}</span> ',
                    '<a alt="next" title="next" class="facetview_increment" ',
                    'style="color:#333;float:right;padding:0 20px 20px 40px;"',
                    ' href="{{to}}">&gt;</a></div>'
                ].join('');
            } else {
                var metaTmpl = [
                    '<div class="pagination"> <ul> ',
                    '<li class="prev"><a class="facetview_decrement" ',
                    'href="{{from}}">&laquo; back</a></li> ',
                    '<li class="active"><a>{{from}} &ndash; {{to}} of ',
                    '{{total}}</a></li> ',
                    '<li class="next"><a class="facetview_increment" ',
                    'href="{{to}}">next &raquo;</a></li> </ul> </div>'
                ].join('');
            }
            $('.facetview_metadata', obj).html('');
            $('.no-results-message').show();
/*            if (options.no_results_message) {
                $('.facetview_metadata', obj).first().html(options.no_results_message);
            } else {
                $('.facetview_metadata', obj).first().html('Not found...');
            }*/

            if (data.found) {
                var from = options.paging.from + 1;
                var size = options.paging.size;
                if (!size) {
                    size = 10;
                }
                var to = options.paging.from + size;
                if (data.found < to) {
                    to = data.found;
                }
                var meta = metaTmpl.replace(/{{from}}/g, from);
                meta = meta.replace(/{{to}}/g, to);
                meta = meta.replace(/{{total}}/g, data.found);
                $('.no-results-message').hide();
                $('.facetview_metadata', obj).html('').append(meta);
                $('.facetview_decrement', obj).bind('click', decrement);
                if (from < size) {
                    $('.facetview_decrement', obj).html('..');
                }
                $('.facetview_increment', obj).bind('click', increment);
                if (data.found <= to) {
                    $('.facetview_increment', obj).html('..');
                }
            }

            $('#facetview_results_wrapper', obj).html('');

            switch(options.display_type) {
                case 'card':
                    window.display_results(options.fields_card, $('<div class="eea-tiles" />'), window.get_widget_card, options.resultModifier);

                    break;
                case 'list':
                    window.display_results(options.fields_list, $('<div class="eea-list-tiles" />'), window.get_widget_list, options.resultModifier);
                    break;
                case 'tabular':
                default:
                    $('#facetview_results_wrapper', obj).html(options.searchwrap_start + options.searchwrap_end);
                    var infofiltervals = [];
                    $.each(data.records, function(index, value) {
                        // write them out to the results div
                         $('#facetview_results', obj).append(buildrecord(index));
                         options.linkify ?
                            $('#facetview_results tr:last-child', obj).linkify() :
                            false;
                    });
                    if (options.result_box_colours.length > 0) {
                        jQuery('.result_box', obj).each(function() {
                            var colour = options.result_box_colours[
                                Math.floor(
                                    Math.random() * options.result_box_colours.length)];
                            jQuery(this).css('background-color', colour);
                        });
                    }
                    $('#facetview_results', obj).children()
                                                    .hide()
                                                    .fadeIn(options.fadein, function(){
                                                        DoubleScroll(document.getElementById('facetview_results_wrapper'));
                                                    });
                    $('.facetview_viewrecord', obj).bind('click', viewrecord);
                    break;
            }

            // if a post search callback is provided, run it

            jQuery('.notify_loading').hide();
            jQuery('.download_data').show();

            //set tree height as the last user setting or 10 lines
            var trees = $('div.facetview_tree');
            var treeNum = trees.length;

            correctFacetRenderer(/*data, trees,options*/);

            if (typeof options.post_search_callback === 'function') {
                options.post_search_callback.call(this);
            }
        };

        // ===============================================
        // functions to do with searching
        // ===============================================

        // filter out unwanted chars
        var filterQueryStrChars = function(querystr) {
            var res = querystr;
            options.querystr_filtered_chars.split('').forEach(
                    function(c) {
                        while (res.indexOf(c) > 0) res = res.replace(c, '');
                    });
            return res;
        };

        // fuzzify the freetext search query terms if required
        var fuzzify = function(querystr) {
            if (querystr.slice(-1) === '\"' &&
                querystr.charAt(querystr.length - 1) === '\"') {
                return querystr;
            }
            var rqs = querystr;
            var pq;
            if (options.default_freetext_fuzzify) {
                if (options.default_freetext_fuzzify === '*' ||
                    options.default_freetext_fuzzify.indexOf('~') > -1) {
                    if (querystr.indexOf('*') === -1 &&
                        querystr.indexOf('~') === -1 &&
                        querystr.indexOf(':') === -1) {
                        var optparts = querystr.split(' ');
                        pq = '';
                        for (var oi = 0; oi < optparts.length; oi++) {
                            var oip = optparts[oi];
                            if (oip.length > 0) {
                                oip += options.default_freetext_fuzzify;
                                if (options.default_freetext_fuzzify === '*') {
                                    oip = '*' + oip;
                                }
                                pq += oip + ' ';
                            }
                        }
                        rqs = pq;
                    }
                }
            }
            return rqs;
        };

        var buildqueryval = function() {
            var qrystr = filterQueryStrChars(options.q);
            var qryval = {'query': fuzzify(qrystr)};
            $('.facetview_searchfield', obj).val() !== '' ?
                qryval.default_field = $('.facetview_searchfield', obj).val() :
                '';

            options.default_operator !== undefined ?
                qryval.default_operator = options.default_operator : false;

            if (options.enable_wildcard_search)
                qryval.analyze_wildcard = true;
            if ((!$.isEmptyObject(options.relevance)) && (options.relevance.fields_boosting !== undefined)){
                qryval.fields = options.relevance.fields_boosting.fields;
            }
            return qryval;
        };

        // build the search query URL based on current params
        var elasticsearchquery = function() {
            var qs = {};
            var bool = false;
            var filter = false;
            var nested = false;
            var seenor = []; // track when an or group are found and processed

            $('.facetview_filterselected', obj).each(function() {
                !bool ? bool = {'must': [] } : '';
                if ($(this).hasClass('facetview_facetrange')) {
                    var addRange = true;
                    var rngs = {
                        'from': $('.facetview_lowrangeval_' +
                                $(this).attr('rel'), this).html(),
                        'to': $('.facetview_highrangeval_' +
                                $(this).attr('rel'), this).html()
                    };
                    if (options.facets[$(this).attr('rel')].field.startsWith("items_count_")){
                        var facet_name = options.facets[$(this).attr('rel')].field.substring(12);
                        var values_for_facet = $(".facetview_filterselected[rel='"+facet_name+"']");
                        if (values_for_facet.length === 0){
                            addRange = false;
                        }
                        else {
                            if (values_for_facet.eq(0).hasClass("facetview_logic_or")){
                                rngs = {"from": 1, "to": 1};
                            }
                            else {
                                rngs = {"from": values_for_facet.length, "to": values_for_facet.length};
                            }
                        }
                    }
                    if (addRange){
                        var rel = options.facets[$(this).attr('rel')].field;
                        var robj = {'range': {}};
                        robj.range[rel] = rngs;
                        // check if this should be a nested query
                        var parts = rel.split('.');
                        if (options.nested.indexOf(parts[0]) !== -1) {
                            !nested ? nested = {
                                    'nested': {
                                        '_scope': parts[0],
                                        'path': parts[0],
                                        'query': {
                                            'bool': {'must': [robj]}
                                        }
                                    }
                                } : nested.nested.query.bool.must.push(robj);
                        } else {
                            bool.must.push(robj);
                        }
                    }
                } else {
                    // TODO: check if this has class facetview_logic_or
                    // if so, need to build a should around it and its siblings

                    if ($(this).hasClass('facetview_logic_or')) {
                        //check if seenor contains rel
                        var rel = $(this).attr('rel');
                        if ($.inArray(rel, seenor) === -1) {
                            seenor.push(rel);
                            var myfilter = {'bool': {'should': []}};
                            $('.facetview_filterselected[rel="' +
                                $(this).attr('rel') + '"]').each(function() {
                                if ($(this).hasClass('facetview_logic_or')) {
                                    if ($(this).hasClass('facetview_facetgeo')) {
                                        if ($(this).hasClass('fores')){
                                            var data = $(this).data("geo_data");

                                            if (data.type === "distance"){
                                                if (parseFloat(data.lat) && parseFloat(data.lon) && parseFloat(data.dist)){
                                                    var tmp_rel = options.facets[$(this).attr('rel')].field;
                                                    var ob = {};
                                                    ob['geo_distance'] = {};
                                                    ob['geo_distance']['distance'] = data.dist + "km";
                                                    ob['geo_distance'][tmp_rel] = {"lat":data.lat, "lon":data.lon};
                                                    myfilter.bool.should.push(ob);
                                                }
                                            }
                                            else {
                                                if (parseFloat(data.lat1) && parseFloat(data.lon1) && parseFloat(data.lat2) && parseFloat(data.lon2)){
                                                    var tmp_rel = options.facets[$(this).attr('rel')].field;
                                                    var ob = {};
                                                    ob['geo_bounding_box'] = {};
                                                    ob['geo_bounding_box'][ tmp_rel ] = {};
                                                    ob['geo_bounding_box'][ tmp_rel ].top_left = {"lat":data.lat1, "lon":data.lon1};
                                                    ob['geo_bounding_box'][ tmp_rel ].bottom_right = {"lat":data.lat2, "lon":data.lon2};

                                                    myfilter.bool.should.push(ob);
                                                }
                                            }
                                        }
                                    }
                                    else {
                                        var value = $(this).attr('href');
                                        var ob;
                                        if (value === 'undefined') {
                                            ob = {'missing': {'field': []}};
                                            ob.missing.field.push(
                                                $(this).attr('rel'));
                                        } else {
                                            ob = {'term': {}};
                                            ob.term[$(this).attr('rel')] = value;
                                       }
                                       myfilter.bool.should.push(ob);
                                    }
                                }
                            });
                            if (myfilter.bool.should.length === 0) {
                                myfilter = false;
                            } else {
                                // A real filter is found
                                if (!filter) {
                                    filter = myfilter;
                                } else if (!filter.and) {
                                    //two or filters on different relations
                                    filter = {'and': [filter, myfilter]};
                                } else {
                                    filter.and.push(myfilter);
                                }
                            }
                        }
                    } else {
                        var value = $(this).attr('href');
                        if (value === 'undefined') {
                            var myfilter = { 'missing': {
                                'field': $(this).attr('rel')}};
                            if (!filter) {
                                filter = myfilter;
                            } else if (filter.and) {
                                filter.and.push(myfilter);
                            } else {
                                filter = {'and': [filter, myfilter]};
                            }
                        } else {
                            var bobj = false;
                            if (($(this).attr('facettype') !== 'range')
                                && ($(this).attr('facettype') !== 'geo') &&
                                ($(this).attr('facettype') !== 'rangehistogram') ){
                                var bobj = {'term': {}};
                                bobj['term'][$(this).attr('rel')] = value;
                            }
                        }
                    }

                    // check if this should be a nested query
                    var parts = $(this).attr('rel').split('.');
                    if (options.nested.indexOf(parts[0]) !== -1) {
                        !nested ? nested = {
                            'nested': {
                                '_scope': parts[0],
                                'path': parts[0],
                                'query': {
                                    'bool': {'must': [bobj]}
                                }
                            }
                        } : nested.nested.query.bool.must.push(bobj);
                    } else {
                        !bobj ? '' : bool['must'].push(bobj);
                    }
                }
            });
            for (var item in options.default_filters) {
                !bool ? bool = {'must': [] } : '';
                var pobj = options.default_filters[item];
                var parts = item.split('.');
                if (options.nested.indexOf(parts[0]) !== -1) {
                    !nested ? nested = {
                        'nested': {
                            '_scope': parts[0],
                            'path': parts[0],
                            'query': {
                                'bool': {'must': [pobj]}
                            }
                        }
                    } : nested.nested.query.bool.must.push(pobj);
                } else {
                    bool['must'].push(pobj);
                }
            }
            for (var item in options.predefined_filters) {
                !bool ? bool = {'must': [] } : '';
                var pobj = options.predefined_filters[item];
                var parts = item.split('.');
                if (options.nested.indexOf(parts[0]) !== -1) {
                    !nested ? nested = {
                        'nested': {
                            '_scope': parts[0],
                            'path': parts[0],
                            'query': {
                                'bool': {'must': [pobj]}
                            }
                        }
                    } : nested.nested.query.bool.must.push(pobj);
                } else {
                    bool['must'].push(pobj);
                }
            }
            if (bool) {
                if (options.q !== '') {
                    var qryval = buildqueryval();
                    bool['must'].push({'query_string': qryval });
                }
                nested ? bool['must'].push(nested) : '';
                bool['must'].length > 0 ?
                    qs['query'] = {'bool': bool} :
                    qs['query'] = {'match_all' : {}};
            } else {
                if (options.q !== '') {
                    var qryval = buildqueryval();
                    qs['query'] = {'query_string': qryval};
                } else {
                    qs['query'] = {'match_all': {}};
                }
            }
            if (filter) {
                var tmp_qs = {};
                $.extend(true, tmp_qs, qs);
                qs['query'] = {};
                qs['query'][options.query_type] = {
                                'query': tmp_qs['query'],
                                'filter': filter
                            };
                qs = addDecayFunctions(qs);
            }
            // set display type
            qs['display_type'] = options.display_type;
            qs['ignore_landing'] = options.ignore_landing;
            // set any paging
            options.paging.from !== 0 ? qs['from'] = options.paging.from : '';
            options.paging.size !== 10 ? qs['size'] = options.paging.size : '';
            // set any sort or fields options
            options.sort.length > 0 ? qs['sort'] = options.sort : '';
            options.fields ? qs['fields'] = options.fields : '';
            options.partial_fields ?
                qs['partial_fields'] = options.partial_fields :
                '';
            // set any facets
            qs['facets'] = {};
            for (var item = 0; item < options.facets.length; item++) {
                var fobj = jQuery.extend(true, {}, options.facets[item]);
                if (fobj.type === 'facet'){
                    fobj.size = 1000000;
                }
                delete fobj['display'];
                delete fobj['min_size'];
                delete fobj['operator'];
                delete fobj['facet_display_options'];
                delete fobj['default_values'];
                delete fobj['autocomplete_placeholder'];
                delete fobj['empty_message'];
                delete fobj['short_name'];
                delete fobj['allow_exact'];
                delete fobj['autocomplete'];
                delete fobj['is_exact'];
                delete fobj['values_whitelist'];
                delete fobj['values_blacklist'];
                delete fobj['type'];
                delete fobj['chart_config'];
                delete fobj['interval'];
                delete fobj['histogram_config'];

                qs['facets'][fobj['field']] = {'terms': fobj};
                for (var ni; ni < options.nested.length; ni++) {
                    if (fobj['field'].indexOf(options.nested[i]) === 0) {
                         nested ?
                            qs['facets'][fobj['field']]['scope'] =
                                options.nested[i] :
                            qs['facets'][fobj['field']]['nested'] =
                                options.nested[i];
                    }
                }
            }
            jQuery.extend(true, qs['facets'], options.extra_facets);
            // set elasticsearch filter, if any
            // set any filter
            if (options.filter) {
                qs['filter'] = options.filter;
            }

            if (options.highlight_enabled){
                qs.highlight = {};
                qs.highlight.fields = {};
                qs.highlight.fields["*"] = {};
            }

            var qy = JSON.stringify(qs);
            if (options.include_facets_in_querystring) {
                options.querystring = qy;
            } else {
                delete qs.facets;
                options.querystring = JSON.stringify(qs);
            }
            options.save_link ?
                $('.facetview_sharesaveurl.download_query', obj)
                    .val('http://' + window.location.host +
                        window.location.pathname +
                        '?source=' + options.querystring) :
                '';
            return qy;
        };

        // change results display
        var dochangedisplay = function(event) {
            event.preventDefault();
            $(".facetview_display_type").find('.eea-icon').removeClass('selected');
            var $this = $(this);
            $this.addClass('selected');
            options.display_type = $this.attr('title');
            setValueInSessionStorage('display_type', options.display_type, 365);
            dosearch();
        };

        //remove display_type from querystring because this extra parameter
        //is not allowed in search parameters
        var removedisplaytype = function(qrystr) {
            var qs = JSON.parse(qrystr);
            delete qs.display_type;
            delete qs.ignore_landing;
            return JSON.stringify(qs);
        };

        var previous_search_term = "";

        var dosuggestfacetvalues = function(tree_prop, request, response) {
            var tree = $(".facetview_tree[rel='" + tree_prop+ "']");
            var records = tree.data('records');
            var values = Object.keys(records);
            var hints = [];
            for (var val_idx = 0; val_idx < values.length; val_idx++){
                if (values[val_idx].toLowerCase().indexOf(request.term.toLowerCase()) !== -1){
                    hints.push({term:values[val_idx], count:records[values[val_idx]], rel:tree_prop});
                }
            }
            response(hints.slice(0, 20));
        };

        var dosuggest = function(request, response) {
            var search_term = request.term.trim();
            if (search_term === ""){
                response([]);
            }
            var last_modified_word = search_term;
            var current_parts = search_term.split(" ").filter(function(value){return value.length !== 0;});
            if (previous_search_term !== ""){
                last_modified_word = current_parts[current_parts.length - 1];
            }
            previous_search_term = search_term;

            var autocomplete_qry = {
                "size": 0,
                "aggs": {
                    "autocomplete_full": {
                        "terms": {
                            "field": "autocomplete",
                            "order": {
                                "_count": "desc"
                            },
                            "include": "*"
                        }
                    },
                    "autocomplete_last": {
                        "terms": {
                            "field": "autocomplete",
                            "order": {
                                "_count": "desc"
                            },
                            "include": "*"
                        }
                    }
                }
            };
            autocomplete_qry.aggs.autocomplete_full.terms.include = search_term + ".*";
            autocomplete_qry.aggs.autocomplete_last.terms.include = last_modified_word + ".*";
            $.ajax({
                type: 'get',
                url: options.search_url,
                data: {source: JSON.stringify(autocomplete_qry)},
                dataType: options.datatype,
                success: function(data){
                    var buckets_full = data.aggregations.autocomplete_full.buckets;
                    var buckets_last = data.aggregations.autocomplete_last.buckets;
                    var hint;
                    var hints = [];
                    for (var i = 0; i < buckets_full.length; i++){
                        hint = buckets_full[i].key;
                        if (hint !== search_term){
                            hints.push(hint.split(" ").filter(function(value){return value.length !== 0;}).join(" "));
                        }
                    }
                    for (var i = 0; i < buckets_last.length; i++){
                        if (buckets_last[i].key.split(" ").length < 3){
                            current_parts[current_parts.length - 1] = buckets_last[i].key;
                            hint = current_parts.join(" ");
                            if (($.inArray(hint, hints) === -1) && (hint !== search_term)){
                                hints.push(hint.split(" ").filter(function(value){return value.length !== 0;}).join(" "));
                            }
                        }
                    }
                    response(hints);
                }
            });
        };

        $.fn.facetview.correct_and_dosearch = function(opts) {
            var search_term = $('.facetview_freetext').val().trim();
            if (search_term === ""){
                dosearch(opts);
            }

            var suggest_qry = {
                "size":0,
                "suggest": {}
            };
            var did_you_mean_template = {
                "text": "*",
                "phrase": {
                    "field": "did_you_mean"
                }
            };

            var words = search_term.split(" ");
            for (var i = 0; i < words.length; i++){
                suggest_qry.suggest['did_you_mean_' + i] = $.extend(true, { }, did_you_mean_template);
                suggest_qry.suggest['did_you_mean_' + i].text = words[i];
            }
            $.ajax({
                type: 'get',
                url: options.search_url,
                data: {source: JSON.stringify(suggest_qry)},
                dataType: options.datatype,
                success: function(data){
                    var count = 0;
                    var did_you_mean_parts = [];
                    var hasHints = false;
                    while (true){
                        var key = "did_you_mean_" + count;
                        if (data.suggest.hasOwnProperty(key)){
                            if (data.suggest[key][0].options.length === 0){
                                did_you_mean_parts.push(data.suggest[key][0].text);
                            }
                            else{
                                did_you_mean_parts.push(data.suggest[key][0].options[0].text);
                                hasHints = true;
                            }
                        }
                        else {
                            break;
                        }
                        count++;
                    }
                    if (!hasHints){
                        dosearch(opts);
                    }
                    else{
                        opts.did_you_mean = did_you_mean_parts.join(" ");
                        dosearch(opts);
                    }
                }
            });
        };

        var correct_and_dosearch = $.fn.facetview.correct_and_dosearch;

        var updateOrder = function(){
            var orderBy_Cookie = getValueFromSessionStorage('order');

            if (orderBy_Cookie.length === 0){
                var freetext = $('.facetview_freetext', obj).val().trim();
                if (freetext.length > 0) {
                    var previous_freetext = getValueFromSessionStorage("previous_freetext");
                    if (previous_freetext !== freetext){
                        options.paging.from = 0;
                    }
                    setValueInSessionStorage("previous_freetext", freetext);
                    var order_options = $('select.facetview_orderby')[0].children;

                    for (var order_option in order_options) {
                        if (order_options[order_option].selected){
                            if (order_options[order_option].value !== ''){
                                options.sort_label_original = order_options[order_option].value;
                                options.sort_original = options.sort;
                            }
                        }
                    }

                    for (var order_option in order_options) {
                        if (order_options[order_option].value === '') {
                            order_options[order_option].selected = 'select';
                        }
                    }
                    options.sort = [];
                }
                else {
                    if ((options.sort_original !== undefined) && (options.sort_label_original !== undefined)){
                        var order_options = $('select.facetview_orderby')[0].children;
                        for (var order_option in order_options) {
                            if (order_options[order_option].value === options.sort_label_original) {
                                order_options[order_option].selected = 'select';
                            }
                        }
                        options.sort = options.sort_original;
                    }
                }
            }

/*            options.paging.from = 0;
            if (options.selected_sort) {
                options.sort = options.selected_sort;
            }
            else {
                var order_options = $('.facetview_orderby')[0].children;
                for (var order_option in order_options) {
                    if (order_options[order_option].value === '')
                        order_options[order_option].selected = 'select';
                }
                options.sort = [];
            }
            dosearch();*/
        };

        function getInitialValuesInStorage(query, data, callback){
            var q = JSON.parse(query);

            if (options.predefined_permanent_filters === undefined){
                q.query = {"match_all":{}};
                q.sort = [];
            }

            q.query = {
                "bool":{
                    "must":options.predefined_permanent_filters
                }
            };
            Object.keys(sessionStorage).map(function(key){
                if(key.indexOf(GROUPS_KEY ) !== -1 ||
                    key.indexOf(SLIDER_KEY ) !== -1
                ){
                    sessionStorage.removeItem(key);
                }
            });

            q.size = 0;
            var qry = JSON.stringify(q);
            if(sessionStorage.getItem(INITIAL_RESULTS_KEY) !== null){
                callback(data);
            } else {
                $.ajax({
                    type: 'get',
                    url: options.search_url,
                    data: {source: qry },
                    // processData: false,
                    dataType: options.datatype,
                    success:function(d){
d.facets = {};
                        $.each(d.facets, function(f_key, f_opts){
                            if (f_opts.terms.length > 0){
                                var f_first = {};
                                $.extend(f_first, f_opts.terms[0]);
                                var f_last = {};
                                $.extend(f_last, f_opts.terms[f_opts.terms.length - 1]);
                                f_opts.terms =[f_first, f_last];
                            }
                        });

                        setValueInSessionStorage( INITIAL_RESULTS_KEY , JSON.stringify(d));
                        callback(data);
                    },
                    error: function(e){
                        callback(data);
                    }
                });
            }

        }

        $.fn.facetview.dosearch = function(opts) {
            // allow dosearch to be called with an opts object which can pass values that can
            // then be used by code inside it. In this case we can pass an option to remove
            // the landing logic when clicking on mobile view within checkLandingPage

            updateOrder();

            if (window.settings_landingpage_enabled){
                opts = opts || {};
                if (opts.remove_landing){
                    options.ignore_landing = opts.remove_landing;
                }
                if (options.ignore_landing){
                    opts.remove_landing = options.ignore_landing;
                }
                checkLandingPage(opts);
            }
            if (options.applyingDefaults){
                return;
            }
            jQuery('.notify_loading').show();
            jQuery('.download_data').hide();
            // update the options with the latest q value
            if (options.searchbox_class.length === 0) {
                if ((opts) && (opts.did_you_mean !== undefined)){
                    $(".search-suggestions a.did_you_mean").text(opts.did_you_mean);
                    $(".search-suggestions a.original_term").text($('.facetview_freetext', obj).val().trim());
                    $(".search-suggestions").show();
                    options.q = opts.did_you_mean;
                }
                else {
                    $(".search-suggestions").hide();
                    options.q = $('.facetview_freetext', obj).val().trim();
                }
            } else {
                options.q = $(options.searchbox_class).last().val();
            }

            //set the default sort
            if ((options.sort.length === 0) && (!jQuery.isEmptyObject(options.default_sort))){
                options.sort = options.default_sort;
            }
            // make the search query
            var qrystr = elasticsearchquery();
            if (qrystr === options.lastqrystr){
                jQuery('.notify_loading').hide();
                jQuery('.download_data').show();
                return;
            }
            if (undefined !== options.lastqrystr) {
                var qrystr_obj = JSON.parse(qrystr);
                var lastqrystr_obj = JSON.parse(options.lastqrystr);
                if (JSON.stringify(lastqrystr_obj.query) !== JSON.stringify(qrystr_obj.query)) {
                    options.paging.from = 0;

                    var tmp_json_qrystr = JSON.parse(qrystr);
                    if (tmp_json_qrystr !== undefined){
                        tmp_json_qrystr.from = 0;
                    }
                    qrystr = JSON.stringify(tmp_json_qrystr);
                }
            }
            options.lastqrystr = qrystr;
            // augment the URL bar if possible
            if (window.history.pushState && options.pushstate && !options.from_popstate) {
                var currurl = encodeURIComponent(options.querystring);
                currurl = '?source=' + currurl;
//                window.history.pushState('', 'search', currurl);
                customSetUrl(options, '', 'search', currurl);
            }

            $.ajax({
                type: 'get',
                url: options.search_url,
                data: {source: removedisplaytype(qrystr)},
                // processData: false,
                dataType: options.datatype,
                beforeSend : function( jqXHR, settings){
                    if(window.outerWidth < 1024){
                        $("#facetview_trees_loader").show("slow");
                    }
                },
                complete: function( jqXHR, textStatus){
                    if(window.outerWidth < 1024) {
                        $("#facetview_trees_loader").hide("slow");
                    }
                },
                success: function(d){
                    //run match all query to get all initial values and then showresults
                    getInitialValuesInStorage(removedisplaytype(qrystr), d, showresults);
                },
                error: function(){
                    $(".facetview_top").hide();
                    $("#facetview_results_wrapper").hide();
//                    $(".facetview_metadata").text("Your search did not return any results").show();
                    $('.no-results-message').show();
                    $(".notify_loading").hide();
                }
            });
        };

        var dosearch = $.fn.facetview.dosearch;



        // show search help
        var learnmore = function(event) {
            event.preventDefault();
            $('#facetview_learnmore', obj).toggle();
        };

        var do_did_you_mean = function(event){
            $('.facetview_freetext').val($("a.did_you_mean").text());
            dosearch();
            event.preventDefault();
        };

        var do_original_term = function(event){
            dosearch();
            event.preventDefault();
        };

        // adjust how many results are shown
        var howmany = function(event) {
            event.preventDefault();
            var newhowmany = window.prompt('Currently displaying ' +
                options.paging.size +
                ' results per page. How many would you like instead?');
            if (newhowmany) {
                options.paging.size = parseInt(newhowmany);
                options.paging.from = 0;
                $('.facetview_howmany', obj).html(options.paging.size);
                dosearch();
            }
        };

        // change the search result order
        var order = function(event) {
            event.preventDefault();
            if ($(this).attr('href') === 'desc') {
                $(this).html('<i class="icon-arrow-up"></i>');
                $(this).attr('href', 'asc');
                $(this).attr('title',
                    'current order ascending. Click to change to descending');
            } else {
                $(this).html('<i class="icon-arrow-down"></i>');
                $(this).attr('href', 'desc');
                $(this).attr('title',
                    'current order descending. Click to change to ascending');
            }
            orderby();
        };

        var orderby = function(event) {
            event ? event.preventDefault() : '';
            var sortchoice = $('.facetview_orderby :selected').val();
            var sortoption = $('.facetview_orderby :selected').attr('href');
            if (sortchoice && sortchoice.length !== 0) {
                var sorting = {};
                var sorton = sortchoice;
                sorting[sorton] = {
                    'order': sortoption
                };
                options.sort = [sorting];
                options.selected_sort = [sorting];
            } else {
                options.sort = [];
                options.selected_sort = [];
            }

            var orderToStore = options.sort[0];
            if (orderToStore === undefined){
                orderToStore = {order:"relevance"};
            }
            setValueInSessionStorage('order', JSON.stringify(orderToStore), 365);
            options.paging.from = 0;
            dosearch();
        };

        // parse any source params out for an initial search
        var parsesource = function() {
            var qrystr = options.source.query;

            var pre_filters = options.predefined_filters;
            function clickfacetvalues(aquery, or) {
                if (typeof aquery === 'string') {
                    clickfilterchoice(false, aquery, 'undefined', or);
                    return;
                }
                if (aquery instanceof Array) {
                    for (var id in aquery) {
                       clickfilterchoice(false, aquery[id], 'undefined', or);
                    }
                    return;
                }
                for (var key in aquery) {
                    var curr_query = aquery[key];
                    if (key === 'term') {
                        for (var t in curr_query) {
                            clickfilterchoice(false, t, curr_query[t], or);
                        }
                    } else if (key === 'missing') {
                        for (var t in curr_query['field']) {
                            clickfilterchoice(false, curr_query['field'][t],
                                                'undefined', or);
                        }
                    } else if (key === 'geo_distance') {
                        var rel = '';
                        var facet = '';
                        for (var tmp_key in aquery.geo_distance){
                            if (tmp_key !== "distance"){
                                facet = tmp_key;
                            }
                        }
                        for (var i = 0; i < options.facets.length; i++){
                            if (options.facets[i].field === facet){
                                rel = i.toString();
                            }
                        }
                        var geoselect = [
                            '<div id="facetview_geoplaceholder_',
                            rel,
                            '" class="facetview_geocontainer clearfix dummytoremove" style="display:none"> ',
                            '<div class="clearfix">',
                                '<div id="geo-facet-tabs_' + rel +'">',
                                '<input class="facetview_geo_type_'+rel+'" type="text" style="display:none">',
                                '<ul>',
                                    '<li><a href="#geo-distance-tab" class="geo-facet-type">Distance</a></li>',
                                    '<li><a href="#geo-bounding-box-tab" class="geo-facet-type">Bounding Box</a></li>',
                                '</ul>',
                                '<div id="geo-distance-tab">',
                                    '<span>latitude</span><input class="facetview_latval_'+rel+'" type="text"><br/>',
                                    '<span>longitude</span><input class="facetview_lonval_'+rel+'" type="text"><br/>',
                                    '<span>distance(km)</span><input class="facetview_distval_'+rel+'" type="text"><br/>',
                                '</div>',
                                '<div id="geo-bounding-box-tab">',
                                    '<span style="font-weight:bold;">Top Left</span><br/>',
                                    '<span style="padding-left:10px">latitude</span><input class="facetview_latval1_'+rel+'" type="text"><br/>',
                                    '<span style="padding-left:10px">longitude</span><input class="facetview_lonval1_'+rel+'" type="text"><br/>',
                                    '<span style="font-weight:bold;">Bottom Right</span><br/>',
                                    '<span style="padding-left:10px">latitude</span><input class="facetview_latval2_'+rel+'" type="text"><br/>',
                                    '<span style="padding-left:10px">longitude</span><input class="facetview_lonval2_'+rel+'" type="text"><br/>',
                                '</div>',
                            '</div>',
                            '</div></div>'
                        ].join('');
                        $(geoselect).appendTo(".facet-view-simple");
                        $(".facetview_geo_type_"+rel).attr("value", "distance");
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_latval_' + rel).attr("value", aquery.geo_distance[facet].lat);
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval_' + rel).attr("value", aquery.geo_distance[facet].lon);
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_distval_' + rel).attr("value", parseFloat(aquery.geo_distance.distance));

                        dofacetgeo(rel, false);
                        $(".dummytoremove").remove();
                    } else if (key === 'geo_bounding_box') {
                        var rel = '';
                        var facet = '';
                        for (tmp_key in aquery.geo_bounding_box){
                            facet = tmp_key;
                        }
                        for (var i = 0; i < options.facets.length; i++){
                            if (options.facets[i].field === facet){
                                rel = i.toString();
                            }
                        }
                        var geoselect = [
                            '<div id="facetview_geoplaceholder_',
                            rel,
                            '" class="facetview_geocontainer clearfix dummytoremove" style="display:none"> ',
                            '<div class="clearfix">',
                                '<div id="geo-facet-tabs_' + rel +'">',
                                '<input class="facetview_geo_type_'+rel+'" type="text" style="display:none">',
                                '<ul>',
                                    '<li><a href="#geo-distance-tab" class="geo-facet-type">Distance</a></li>',
                                    '<li><a href="#geo-bounding-box-tab" class="geo-facet-type">Bounding Box</a></li>',
                                '</ul>',
                                '<div id="geo-distance-tab">',
                                    '<span>latitude</span><input class="facetview_latval_'+rel+'" type="text"><br/>',
                                    '<span>longitude</span><input class="facetview_lonval_'+rel+'" type="text"><br/>',
                                    '<span>distance(km)</span><input class="facetview_distval_'+rel+'" type="text"><br/>',
                                '</div>',
                                '<div id="geo-bounding-box-tab">',
                                    '<span style="font-weight:bold;">Top Left</span><br/>',
                                    '<span style="padding-left:10px">latitude</span><input class="facetview_latval1_'+rel+'" type="text"><br/>',
                                    '<span style="padding-left:10px">longitude</span><input class="facetview_lonval1_'+rel+'" type="text"><br/>',
                                    '<span style="font-weight:bold;">Bottom Right</span><br/>',
                                    '<span style="padding-left:10px">latitude</span><input class="facetview_latval2_'+rel+'" type="text"><br/>',
                                    '<span style="padding-left:10px">longitude</span><input class="facetview_lonval2_'+rel+'" type="text"><br/>',
                                '</div>',
                            '</div>',
                            '</div></div>'
                        ].join('');
                        $(geoselect).appendTo(".facet-view-simple");
                        $(".facetview_geo_type_"+rel).attr("value", "bounding-box");
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_latval1_' + rel).attr("value", aquery.geo_bounding_box[facet].top_left.lat);
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval1_' + rel).attr("value", aquery.geo_bounding_box[facet].top_left.lon);
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_latval2_' + rel).attr("value", aquery.geo_bounding_box[facet].bottom_right.lat);
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval2_' + rel).attr("value", aquery.geo_bounding_box[facet].bottom_right.lon);

                        dofacetgeo(rel, false);
                        $(".dummytoremove").remove();
                    }
                }

            }

            function selectrangevalues(rangefacet, from, to){
                var rel = -1;
                var facet_id;
                for (var i = 0; i < options.facets.length; i++){
                    if (options.facets[i].field === rangefacet){
                        options.facets[i].default_values = [from, to];
                        rel = i.toString();
                        facet_id = options.facets[i].field;
                    }
                }

                var lowval = from;
                var highval = to;

                var range = ' <span class="facetview_lowrangeval_' + rel + '">' + lowval + '</span> <small>to</small><span class="facetview_highrangeval_' + rel + '">' + highval + '</span>';

                var href = "";


                var newobj = [
                    '<div style="display:none;" class="btn-group"',
                    'id="facetview_rangeresults_',
                    rel,
                    '"> ',
                    '<a class="facetview_filterselected facetview_facetrange ',
                    'facetview_clear btn btn-info"',
                    'facettype="' + options.facets[rel].type + '"',
                    ' rel="',
                    rel,
                    '" alt="remove" title="remove" href="',
                    href,
                    '">',
                    range,
                    ' <i class="icon-white icon-remove hidden"></i></a></div>'
                ].join('');

                $('#facetview_selectedfilters', obj).append(newobj);


                var relclean = rel.replace(/\./gi, '_').replace(/\:/gi, '_');

                var myobj = '<div class="facetview_selection"> <a ' +
                        'class="facetview_filterselected facetview_clear btn';
                var operation = $('.facetview_or[href="' + rel + '"]', obj);
                var op_text = 'all';
                myobj = [myobj,
                         '" ',
                         'facettype="'+ options.facets[rel].type +'"',
                         ' rel="',
                         rel,
                         '" alt="remove" title="remove" href="',
                         href,
                         '">',
                         ' <i class="icon-white icon-remove hidden"></i></a>',
                         lowval,
                         ' - ',
                         highval,
                         '</div>'
                        ].join('');
                var title = options.facetnames ? options.facetnames[facet_id] : '';

                var exact_helper_class = '';
                if (rangefacet.startsWith("items_count_")){
                    exact_helper_class = 'exact_helper';
                }

                var pobj = [
                            '<div id="facetview_group_',
                            relclean,
                            '" class="btn-group facetview_selected ' + exact_helper_class + '">',
                            '<h3 class="facetview_group_title">',
                            title,
                            '</h3>',
                            myobj,
                            '</div>'
                            ].join('');
                if ($('div.facetview_selected').length) {
                    pobj = '<div class="facet-rel-between"> <a class="btn ' +
                            'btn-small facet_operator"> AND</a></div>' + pobj;
                }

                $('#facetview_selected_filters', obj).append(pobj);
                if ($('.current-filters:hidden')) {
                    $('.current-filters').show();
                }

                var clearHandler = {
                    "range": clearfacetrange,
                    "rangehistogram": clearfacetrangeHistogram
                };

                $('.facetview_filterselected[facettype="'+ options.facets[rel].type +'"]', obj).unbind('click', clearHandler[ options.facets[rel].type ]);
                $('.facetview_filterselected[facettype="'+ options.facets[rel].type +'"]', obj).bind('click', clearHandler[ options.facets[rel].type ]);

                /*if(options.facets[rel].type === "rangehistogram"){
                    $('.facetview_filterselected[facettype="range"]', obj).unbind('click',
                        clearfacetrangeHistogram);
                    $('.facetview_filterselected[facettype="range"]', obj).bind('click',{ rel: rel},
                        clearfacetrangeHistogram);
                } else {
                    $('.facetview_filterselected[facettype="range"]', obj).unbind('click',
                        clearfacetrange);
                    $('.facetview_filterselected[facettype="range"]', obj).bind('click',
                        "parsesource.selectrangevalues",
                        clearfacetrange);
                }*/


                if (rangefacet.startsWith("items_count_")){
                    var real_facet = rangefacet.substring(12);
                    for (var facet_count = 0; facet_count < options.facets.length; facet_count++){
                        if (options.facets[facet_count].field === real_facet){
                            options.facets[facet_count].is_exact = true;
                        }
                    }
                    //$("[id='" + real_facet + "']").closest(".facetview_filter").find(".facetview_exact").prop("checked", true);
                }
            }
            if (options.query_type in qrystr) {
                var qrys = [];
                var flts = [];
                var or = false;
                var qryflt = qrystr[options.query_type];
                if ('query' in qryflt && 'bool' in qryflt.query) {
                    var qrybool = qryflt.query.bool;
                    if ('must' in qrybool) {
                        qrys = qrybool.must;
                    } else if ('should' in qrybool) {
                        qrys = qrybool.should;
                    }
                }
                if ('filter' in qryflt) {
                    var qry_flt = qryflt.filter;

                    var ftls;
                    if ('missing' in qry_flt && 'field' in qry_flt.missing) {
                        flts = [qry_flt.missing.field];
                    }
                    if ('bool' in qry_flt && 'should' in qry_flt.bool) {
                        var value = qry_flt.bool.should;
                        if (flts instanceof Array) {
                            ftls = [];
                            var len = value.length;
                            for (var idx = 0; idx < len; idx++) {
                                var curr_flts = value[idx];
                                if ('missing' in curr_flts &&
                                    'field' in curr_flts.missing) {
                                    flts.push(curr_flts.missing.field);
                                } else if (('term' in curr_flts) || ('geo_distance' in curr_flts) || ('geo_bounding_box' in curr_flts)) {
                                    flts.push(curr_flts);
                                    or = true;
                                }
                            }
                            //flts = flts.missing.field;
                        } else {
                            or = true;
                            flts = value;
                        }
                    } else if ('and' in qry_flt) {
                        var andfilter = qry_flt.and;
                        var len = andfilter.length;
                        for (var p = 0; p < len; p++) {
                            or = true;
                            var currflt = andfilter[p];
                            if ('bool' in currflt &&
                                'should' in currflt.bool) {
                                flts.push(currflt.bool.should);
                            } else if ('missing' in currflt &&
                                'field' in currflt.missing) {
                                flts.push(currflt.missing.field);
                            }
                        }
                    }
                }

                for (var qry = 0; qry < qrys.length; qry++) {
                    var curr_qry = qrys[qry];
                    var in_pre = false;
                    for (var p = 0; p < pre_filters.length; p++) {
                        if (JSON.stringify(curr_qry) ===
                            JSON.stringify(pre_filters[p])) {
                            in_pre = true;
                            break;
                        }
                    }
                    if (in_pre) {
                        continue;
                    }

                    for (var key in curr_qry) {
                        if (key === 'term') {
                            var curr_qry_key = curr_qry[key];
                            for (var t in curr_qry_key) {
                                clickfilterchoice(false, t,
                                    curr_qry_key[t], false);
                            }
                        } else if (key === 'range') {
                            for (var t in curr_qry[key]) {
                                selectrangevalues(t, curr_qry[key][t].from, curr_qry[key][t].to);
                            }
                        }
                        // else if (key === 'bool') {
                        //     //TODO: handle sub-bools
                        // }
                    }
                }

                for (var flt = 0; flt < flts.length; flt++) {
                    var curr_flt = flts[flt];
                    var in_pre = false;
                    for (var p = 0; p < pre_filters.length; p++) {
                        if (JSON.stringify(curr_flt) ===
                            JSON.stringify(pre_filters[p])) {
                            in_pre = true;
                            break;
                        }
                    }
                    if (in_pre) {
                        continue;
                    }

                    if (or) {
                        if (curr_flt instanceof Array) {
                            for (var id = 0; id < curr_flt.length; id++) {
                                clickfacetvalues(curr_flt[id], or);
                            }
                        } else if (typeof curr_flt === 'string') {
                            clickfilterchoice(false, curr_flt,
                                'undefined', true);
                        } else {
                            clickfacetvalues(curr_flt, or);
                        }
                    } else {
                        if (curr_flt instanceof Array) {
                            for (var id = 0; id < curr_flt.length; id++) {
                                clickfacetvalues(curr_flt[id], or);
                            }
                        } else if (typeof curr_flt === 'string') {
                            clickfilterchoice(false, curr_flt,
                                'undefined', false);
                        }
                        // else {
                        //     //TODO: Decide what to do for unknown options
                        // }
                    }
                }
            } else {
                if ('bool' in qrystr) {
                    var qrys = [];
                    // TODO: check for nested
                    if ('must' in qrystr.bool) {
                        qrys = qrystr.bool.must;
                    } else if ('should' in qrystr.bool) {
                        qrys = qrystr.bool.should;
                    }
                    for (var qry = 0; qry < qrys.length; qry++) {
                        var curr_qry = qrys[qry];
                        var in_pre = false;
                        for (var p = 0; p < pre_filters.length; p++) {
                            if (JSON.stringify(curr_qry) ===
                                JSON.stringify(pre_filters[p])) {
                                in_pre = true;
                                break;
                            }
                        }
                        if (in_pre) {
                            continue;
                        }

                        for (var key in curr_qry) {
                            if (key === 'term') {
                                for (var t in curr_qry[key]) {
                                    clickfilterchoice(false, t,
                                        curr_qry[key][t], false);
                                }
                            } else if (key === 'range') {
                                for (var t in curr_qry[key]) {
                                    selectrangevalues(t, curr_qry[key][t].from, curr_qry[key][t].to);
                                }
                            } else if (key === 'query_string') {
                                typeof(curr_qry[key]['query']) === 'string' ?
                                    options.q = curr_qry[key]['query'] : '';
                            }
                            // else if (key === 'bool') {
                            //     // TODO: handle sub-bools
                            // }
                        }
                    }
                } else if ('query_string' in qrystr) {
                    typeof(qrystr.query_string.query) === 'string' ?
                        options.q = qrystr.query_string.query : '';
                }
            }
        };

        // show the current url with the result set as the source param
        var sharesave = function(event) {
            event.preventDefault();
            $('.facetview_sharesavebox', obj).toggle();
        };

        // adjust the search field focus
        var searchfield = function(event) {
            event.preventDefault();
            options.paging.from = 0;
            dosearch();
        };

        // a help box for embed in the facet view object below
        var thehelp = [
            '<div id="facetview_learnmore" ',
            'class="well" style="margin-top:10px; ',
            'display:none;">'
        ].join('');
        options.sharesave_link ?
            thehelp += '<p><b>Share</b> or <b>save</b> the current search ' +
                'by clicking the share/save arrow button on the right.</p>' :
            '';
        thehelp = [
            thehelp,
            '<p><b>Remove all</b> search values and settings by clicking the ',
            '<b>X</b> icon at the left of the search box above.</p> ',
            '<p><b>Partial matches with wildcard</b> can be performed by using',
            ' the asterisk <b>*</b> wildcard. For example, <b>einste*</b>, ',
            '<b>*nstei*</b>.</p> <p><b>Fuzzy matches</b> can be performed ',
            'using tilde <b>~</b>. For example, <b>einsten~</b> may help find',
            ' <b>einstein</b>.</p> <p><b>Exact matches</b> can be performed ',
            'with <b>"</b> double quotes. For example <b>"einstein"</b> or ',
            '<b>"albert einstein"</b>.</p> <p>Match all search terms by ',
            'concatenating them with <b>AND</b>. For example <b>albert AND ',
            'einstein</b>.</p> <p>Match any term by concatenating them with ',
            '<b>OR</b>. For example <b>albert OR einstein</b>.</p> <p><b>',
            'Combinations</b> will work too, like <b>albert OR einste~</b>, or',
            ' <b>"albert" "einstein"</b>.</p> <p><b>Result set size</b> can ',
            'be altered by clicking on the result size number preceding the ',
            'search box above.</p>'
        ].join('');

        if (options.searchbox_fieldselect.length > 0) {
            thehelp += [
                '<p>By default, terms are searched for across entire record ',
                'entries. This can be restricted to particular fields by ',
                'selecting the field of interest from the <b>search field',
                '</b> dropdown</p>'
            ].join('');
        }

        if (options.search_sortby.length > 0) {
            thehelp = [
                thehelp,
                '<p>Choose a field to <b>sort the search results</b> ',
                'by clicking the double arrow above.</p>'
            ].join('');
        }

        if (options.facets.length > 0) {
            thehelp = [
                thehelp,
                '<hr></hr>',
                '<p>Use the <b>filters</b> on the left to directly select ',
                'values of interest. Click the filter name to open the list ',
                'of available terms and show further filter options.</p> ',
                '<p><b>Filter list size</b> can be altered by clicking on the ',
                'filter size number.</p> <p><b>Filter list order </b> can be ',
                'adjusted by clicking the order options - from a-z ascending ',
                'or descending, or by count ascending or descending.</p> ',
                '<p>Filters search for unique values by default; to do an ',
                '<b>OR</b> search - e.g. to look for more than one value ',
                'for a particular filter - click the OR button for the ',
                'relevant filter then choose your values.</p> <p>To further ',
                'assist discovery of particular filter values, use in ',
                'combination with the main search bar - search terms entered ',
                'there will automatically adjust the available filter values.',
                '</p>'
            ].join('');
            if (options.enable_rangeselect) {
                thehelp = [
                    thehelp,
                    '<p><b>Apply a filter range</b> rather than just selecting',
                    ' a single value by clicking on the <b>range</b> button. ',
                    'This enables restriction of result sets to within a range',
                    ' of values - for example from year 1990 to 2012.</p> ',
                    '<p>Filter ranges are only available across filter values',
                    ' already in the filter list; so if a wider filter range ',
                    'is required, first increase the filter size then select ',
                    'the filter range.</p>'
                ].join('');
            }
        }

        thehelp = [
            thehelp,
            '<p><a class="facetview_learnmore label" href="#">close the help',
            '</a></p></div>'
        ].join('');

        // the facet view object to be appended to the page
        var thefacetview = [
            '<div id="facetview"><div class="row-fluid">',
            '<div class="facetview_search_options_container span12"> <div ',
            'class="btn-group" style="display:inline-block; margin-right:5px;',
            ' width:100%"> <a class="btn btn-small facetview_learnmore" ',
            'style="float:right" title="click to view search help information"',
            ' href="#"><b>?</b></a><a class="btn btn-small facetview_howmany"',
            ' title="change result set size" href="#">{{HOW_MANY}}</a>'
            ].join('');

        if (options.save_link) {
            thefacetview = [
                thefacetview,
                '<a class="btn facetview_sharesave" title="share or save this',
                ' search" href="" style="float:right"> <i ',
                'class="icon-share-alt"></i></a><div ',
                'class="facetview_sharesavebox alert alert-info" ',
                'style="float:right; display:none; "> <button type="button" ',
                'class="facetview_sharesave close"></button><p>Share or save',
                ' this search:</p>',
                '<form id="eea_download_form" action="tools/download">',
                ' <textarea name="download_query" class="facetview_sharesaveurl download_query" ',
                'style="width:100%;height:100px;">http://',
                window.location.host,
                window.location.pathname,
                '?source=',
                options.querystring,
                '</textarea>',
                '<input type="hidden" name="download_format"/>',
                '</form>',
                ' </div>',
                thehelp
            ].join('');
        }

        thefacetview = [
            thefacetview,
            '<div style="clear:both;" class="btn-toolbar" ',
            'id="facetview_selectedfilters"></div>',
            '</div></div><div class="span12" style="margin-left:0px">'
            ].join('');

/* disable global exact search
        var exact_all_html = '';
        if (options.enable_exact) {
            exact_all_html = [
                '<div class="facetview_header_exact_container">',
                    '<p>Show results that are:</p>',
                    '<input type="radio" name="exact_results" value="all" checked="checked"/>',
                    'including the following tags',
                    '<input type="radio" name="exact_results" value="exact"/>',
                    'containing only these tags',
                '</div>'
            ].join('');
        }
*/
        if (options.facets.length > 0 || options.static_filters.length > 0) {
            thefacetview = [
                thefacetview,
                '<div class="span3 right-column-area eea-section eea-right-section" style="margin-left:0px">',
                '<div id="facetview_trees" style="padding-top:0px; position:relative;">',
                '<div id="facetview_trees_loader" style="',
                'display: none; position:absolute; top: 0;left: 0; background-color: rgba(255,255,255,0.4);width:120%;height:110%; z-index: 1000;"',
                '></div>',
                '</div></div><div class="span9" id="facetview_rightcol">',
                '<div class="facetedview_search">',
                '<span class="eea-icon eea-icon-search eea-icon-2x"></span>',
                '<input type="text" autofocus class="facetview_freetext span9" ',
                'style="display:block; margin-left:auto; margin-right: auto; ',
                'background:',
                options.searchbox_shade,
                '; name="q" value="" placeholder="Search term" />',
                '</div>',
                '<div id="facetview_filters"><h2>Filter your results</h2>',
                '</div>',
                '<div class="portalMessage attentionMessage no-results-message">Your search gave no results. <strong>Hint:</strong> try to use other terms, adjust your filters or reset them below.</div>',
                '<div class="current-filters" style="display:none">',
                '<div class="filters-header">',
                '<h2 class="filters-header__header">Current filters</h2>',
                '<a class="clear-all eea-icon eea-icon-eraser" href="{{REFRESH}}"><span>Reset filters</span></a>',
/* disable global exact search
                exact_all_html,*/
                ' </div> <div class="facetview-filter-values" ',
                'id="facetview_selected_filters"></div></div>'
            ].join('');
        } else {
            thefacetview += [
                '<div class="span12" id="facetview_rightcol">',
                '<input type="text" class="facetview_freetext span11" ',
                'style="display:block; margin-left:auto; margin-right: auto; ',
                'background:',
                options.searchbox_shade,
                '; name="q" value="" placeholder="search term" />'
                ].join('');
        }

        thefacetview += '<div class="facetview_top">' +
            '<div class="search-suggestions" style="display:none">' +
            '<span class="did_you_mean">Showing results for </span>' +
            '<a class="did_you_mean" href="#"></a>' +
            '<br/>' +
            '<span class="original_term">Search instead for </span>' +
            '<a class="original_term" href="#"></a>'+
            '</div>'+
            '<div class="top-pagination">';
        if (options.pager_on_top) {
            thefacetview += '<div class="facetview_metadata"/>';
        }
        thefacetview += '</div>';

        // download as buttons
        thefacetview += '<div class="facetview_download filter-by">';
        thefacetview += '<a class="eea_download_btn eea_download_stripe" download_type="tsv" href="tools/download">Download TSV</a>';
        if (window.settings_es_debug_enabled){
            thefacetview += '<a class="eea_download_btn eea_download_stripe" download_type="csv" href="tools/download">Download CSV</a>';
            thefacetview += '<a class="eea_download_btn" download_type="es_query" href="#">Elastic Query</a>';
        }
        else {
            thefacetview += '<a class="eea_download_btn" download_type="csv" href="tools/download">Download CSV</a>';
        }
        thefacetview += '</div>';

        thefacetview += '<div class="filter-by facetview_orderby">';

        if (options.search_sortby.length >= 0) {
            thefacetview = [
                thefacetview,
                '<span class="orderby">Order &nbsp;</span>',
                '<select class="facetview_orderby">',
                '<option class="facetview_orderby_relevance" value="">Relevance</option> '
            ].join('');
            for (var each = 0; each < options.search_sortby.length; each++) {
                var selectThis = false;
                var obj = options.search_sortby[each];
                var order = undefined;
                if (!options.selected_sort &&
                    options.sort[0][obj['field']] !== undefined &&
                    options.sort[0][obj['field']]['order'] !== undefined) {
                        selectThis = true;
                        order = options.sort[0][obj['field']]['order'];
                }
                var sortAsc = obj['display_asc'] ||
                              (obj['display'] + ' ascending');
                var sortDesc = obj['display_desc'] ||
                               (obj['display'] + ' descending');
                thefacetview += [
                    '<option value="',
                    obj['field'],
                    '" href="asc" ',
                    selectThis && order === 'asc' ? 'selected=""' : '',
                    '> ',
                    sortAsc,
                    ' </option> <option value="',
                    obj['field'],
                    '" href="desc" ',
                    selectThis && order === 'desc' ? 'selected=""' : '',
                    '> ',
                    sortDesc,
                    ' </option>'
                ].join('');
            }
            thefacetview += '</select>';
        }
        thefacetview += '</div>'; /* /orderby */

        if (options.display_type_options.length>1) {
            thefacetview += '<div class="facetview_display_type filter-by"><span>Display as </span>';
            for (var i=0; i<options.display_type_options.length; i++) {
                var dt = options.display_type_options[i];
                if (options.display_type===dt) {thefacetview += '<span class="eea-icon selected ' + dt + '" title="' + dt + '"> </span>';}
                else {thefacetview += '<span class="eea-icon ' + dt + '" title="' + dt + '"> </span>';}
            }
            thefacetview += '</div>';
        }

        if (options.searchbox_fieldselect.length > 0) {
            thefacetview = [
                thefacetview,
                '<select class="facetview_searchfield" ',
                ';"><option value="">search all</option>'
            ].join('');
            var field_len = options.searchbox_fieldselect.length;
            for (var each = 0; each < field_len; each++) {
                var obj = options.searchbox_fieldselect[each];
                thefacetview = [
                    thefacetview,
                    '<option value="',
                    obj['field'],
                    '">',
                    obj['display'],
                    '</option>'
                ].join('');
            }
            thefacetview += '</select>';
        }

        thefacetview += '</div>'; /* /facetedtop */
        thefacetview += '<div style="clear:both"> </div>';
        thefacetview += '<div class="notify_loading"></div>';

        thefacetview += '<div id="facetview_results_wrapper"></div>';
        thefacetview += '<div class="facetview_metadata">' +
            '</div></div></div></div></div>';

        var obj;

        // ===============================================
        // now create the plugin on the page
        return this.each(function() {
            // get this object
            obj = $(this);

            // what to do when ready to go
            var whenready = function() {
                // append the facetview object to this object
                thefacetview = thefacetview.replace(
                    /{{HOW_MANY}}/gi,
                    options.paging.size);

                var href = window.location.origin + window.location.pathname;

                thefacetview = thefacetview.replace(/{{REFRESH}}/gi, href);
                obj.append(thefacetview);
                !options.embedded_search ?
                    $('.facetview_search_options_container', obj).hide() : '';


                var filter_div = $('<div class="pull-right"><a href="#" class="eea-section-trigger">Filters <span class="eea-icon eea-icon-bars"></span></a></div>');
                filter_div.insertAfter('.top-pagination');


                // bind learn more and how many triggers

                $('.facetview_learnmore', obj).bind('click', learnmore);
                $('.facetview_howmany', obj).bind('click', howmany);
                $('.facetview_searchfield', obj).bind('change', searchfield);
                $('.facetview_orderby', obj).bind('change', orderby);
                $('.facetview_display_type span', obj).bind('click', dochangedisplay);
                $('a.did_you_mean', obj).bind('click', do_did_you_mean);
                $('a.original_term', obj).bind('click', do_original_term);

/* disable global exact search
                $('.facetview_header_exact_container input', obj).bind('change', toggleexact_all);
*/
                if (options.save_link) {
                    var html = [
                        '<div ',
                        'class="facetview_sharesavebox alert alert-info" ',
                        'style="float:right; display:none; "> <button type="button" ',
                        'class="facetview_sharesave close"></button><p>Share or save',
                        ' this search:</p> <textarea class="facetview_sharesaveurl" ',
                        'style="width:100%;height:100px;">http://',
                        window.location.host,
                        window.location.pathname,
                        '?source=',
                        options.querystring,
                        '</textarea></div>'
                        ].join('');
                    $('.facet-share').appendTo(".share-panel");

                    $('.facet-share').append(html);
                    $('.facetview-share').bind('click', sharesave);
                } else {
                    $('.facetview_sharesave', obj).bind('click', sharesave);
                }


                // check paging info is available
                !options.paging.size && options.paging.size !== 0 ?
                    options.paging.size = 10 : '';
                !options.paging.from ? options.paging.from = 0 : '';

                // handle any source options
                if (options.source) {
                    parsesource();
                    delete options.source;
                }

                // set any default search values into the search bar and create
                // any required filters
                if (options.searchbox_class.length === 0) {
                    var q = options.q.trim();
                    var wildc = options.default_freetext_fuzzify;
                    if ((wildc !== undefined) && (wildc !== "")){
                        var indexof = q.indexOf(wildc);
                        var wildchars = wildc.length;
                        if (indexof === 0) {
                            q = q.slice(1);
                        }
                        if (indexof + wildchars === q.length) {
                            q = q.slice(0, - wildchars);
                        }
                    }

                    options.q !== '' ?
                        $('.facetview_freetext', obj).val(q) : '';
                    buildfilters();

                    if (window.settings_suggestions_enabled){
                        if ($.fn.autocompleteWithHighlight) {
                        $('.facetview_freetext', obj).autocompleteWithHighlight({
                            source: dosuggest
                        });
                        }
                        $('.facetview_freetext', obj).bindWithDelay(
                            'keyup',
                            $.fn.facetview.correct_and_dosearch,
                            options.freetext_submit_delay);
                    }
                    else {
                        $('.facetview_freetext', obj).bindWithDelay(
                            'keyup',
                            $.fn.facetview.dosearch,
                            options.freetext_submit_delay);
                    }
                } else {
                    options.q !== '' ?
                        $(options.searchbox_class).last().val(options.q) : '';
                    buildfilters();
                    $(options.searchbox_class).bindWithDelay(
                        'keyup',
                        dosearch,
                        options.freetext_submit_delay);
                }

                options.source || options.initialsearch ? dosearch() : '';

            };

            // check for remote config options, then do first search
            if (options.config_file) {
                $.ajax({
                    type: 'get',
                    url: options.config_file,
                    dataType: 'jsonp',
                    success: function(data) {
                        options = $.extend(options, data);
                        whenready();
                    },
                    error: function() {
                        $.ajax({
                            type: 'get',
                            url: options.config_file,
                            success: function(data) {
                                options = $.extend(options, $.parseJSON(data));
                                whenready();
                            },
                            error: function() {
                                whenready();
                            }
                        });
                    }
                });
            } else {
                whenready();
            }

            if (options.post_init_callback) {
                options.post_init_callback();
            }

        }); // end of the function


    };


    // facetview options are declared as a function so that they can be
    // retrieved externally (which allows for saving them remotely etc)
    $.fn.facetview.options = {};

})(jQuery);

$(document).ready(function($){
    $(this).delegate(".eea_download_btn","click", function(event){
        event.preventDefault();
        if ($(this).attr("download_type") === "es_query"){
            var url_options = $.getUrlVars($.fn.facetview.options).source;
            delete(url_options.display_type);
            delete(url_options.ignore_landing);
            url_options.explain = true;
            var dialog = "<div title='Elastic Query' style='width:300px;height:200px'><textarea style='width:270px;height:180px'>" + JSON.stringify(url_options)+ "</textarea></div>";
            $(dialog).dialog();
        }
        else {
            $("input[name='download_format']").attr("value",  $(this).attr("download_type"));
            $("#eea_download_form").submit();
        }
    });

    window.onpopstate = function(event) {
//        var url = location.search;
//        var search_query = decodeURIComponent(url.substr(8, url.length));
        var url = customGetUrl($.fn.facetview.options);
        var search_query = decodeURIComponent(url.split("?source=")[1]);
        var old_query = $.fn.facetview.options.lastqrystr;
        var url_vars = JSON.parse(search_query);
        var last_qry_vars = JSON.parse(old_query);
        $.fn.facetview.options.from_popstate = true;
        var history_changed = false;
        // expired
        var $expired = $("#include_expired");
        var url_expired = search_query.indexOf('http://purl.org/dc/terms/expires');
        var has_expired = $expired.length;
        var expired_state = has_expired && $expired[0].checked;
        if (has_expired) {
            if (url_expired === -1 && !expired_state || url_expired  !== -1 && expired_state) {
                $expired.click();
                history_changed = true;
            }
        }

        // order by click
        if (!history_changed) {
            (function(){
                var $order_by = $(".facetview_orderby");
                var $opts = $order_by.find('option');
                var $sel_opt = $opts.filter(":selected");
                var sel_val = $sel_opt.val();
                if (!url_vars.sort && sel_val) {
                    $sel_opt.attr('selected', false);
                }
                var url_sel_val = findObjectByKey(url_vars.sort, 0);
                if (url_sel_val) {
                    var url_sel_key = Object.keys(url_sel_val)[0];
                    var $url_opt = $opts.filter("[value='" + url_sel_key + "']")
                        .filter("[href='" + url_sel_val[url_sel_key].order + "']");
                }
                else {
                    $url_opt = $opts.eq(0);
                }
                if ($sel_opt[0] !== $url_opt[0]) {
                    $url_opt.prop('selected', true).change();
                    history_changed = true;
                }

            }());
        }

        // display change
        if (!history_changed) {
            (function() {
                var url_display = url_vars.display_type;
                var lst_display = last_qry_vars.display_type;
                if (url_display !== lst_display && !history_changed) {
                    $(".filter-by").find('.' + url_display).click();
                    history_changed = true;
                }
            }());
        }

        // query search change
        if (!history_changed) {
            (function() {
                var has_url_query_string = search_query.indexOf('query_string') !== -1;
                var url_search;
                var $search_query_input = $(".facetview_freetext");
                var search_query_input_val = $search_query_input.val();
                if (!has_url_query_string && search_query_input_val !== "") {
                    $search_query_input.val("");
                    $.fn.facetview.dosearch();
                    history_changed = true;
                }
                else {
                    url_search = $.getUrlVars($.fn.facetview.options).q;
                    if (url_search && search_query_input_val !== url_search) {
                        $search_query_input.val(url_search);
                        $.fn.facetview.dosearch();
                        history_changed = true;
                    }
                }
            }());
        }

        // facet change
        var url_function_score = url_vars.query.function_score || url_vars;
            url_function_score = url_function_score.query.filtered ? url_function_score.query.filtered : url_function_score;
        var url_filters = url_function_score.filter ? url_function_score.filter.and || url_function_score.filter.bool.should : [];
        var url_queries = url_function_score.query.bool.must || url_function_score.query.bool.should;
        var function_score = last_qry_vars.query.function_score || last_qry_vars;
            function_score = function_score.query.filtered ? function_score.query.filtered : function_score;
        var filters = function_score.filter ? function_score.filter.and || function_score.filter.bool.should : [];
        var queries = function_score.query.bool.must || function_score.query.bool.should;
        var filter;
        var key;
        var obj;
        var $header;
        var $faceted_trees = $("#facetview_trees");
        var $parent, $el;
        var current = {};
        var $exact_facetviews = $(".facetview_exact");
        var queries_change = url_queries.length - queries.length;
        var queries_addition;
        var filter_last_qry;
        var obj_last_qry, key_last_qry;
        // exact and match addition or deletion
        function check_filters(url_filters) {
            var is_found = false;

            for (var i = 0, length = url_filters.length; i < length; i++) {
                filter = url_filters[i];
                key = Object.keys(filter)[0];
                obj = filter[key];
                while(typeof(obj) === "object") {
                    key = Object.keys(obj)[0];
                    obj = obj[key];
                }
                var $header = $faceted_trees.find("[id=" + "'" + key + "']");
                if (!$header.length) {
                    continue;
                }
                var $parent = $header.parent();
                if (!current.hasOwnProperty(key)) {
                    current[key] = [];
                    $parent.find('.jstree-clicked').find('.facet_label_text').each(function(idx, el) { current[key].push(el.innerText)});
                }
                var term_key, term_val = filter;
                while(!term_val.length) {
                   term_key = Object.keys(term_val)[0];
                   term_val = term_val[term_key];
                }
                if (key === term_key && obj === term_val) {
                    var idx = current[key].indexOf(obj);
                    if (idx !== -1) {
                        current[key].splice(idx, 1);
                    }
                    if (length === 1 && !current[key].length) {
                        return true;
                    }
                }
                else {
                    for (var j = 0, j_length = term_val.length; j < j_length; j++) {
                        obj = term_val[j];
                        while(typeof(obj) === "object") {
                            key = Object.keys(obj)[0];
                            obj = obj[key];
                        }
                        var idx = current[key].indexOf(obj);
                        if (idx !== -1) {
                            current[key].splice(idx, 1);
                        }
                        else {
                            current[key].push(obj);
                            $el = $parent.find('.jstree-container-ul').find('li').filter("[title='" + obj + "']");
                            $el = $el.find('a');
                            if ($el.length) {
                                $el.click();
                                return true;
                            }
                        }
                    }
                }
            }
            return is_found;
        }

        if ([-1, 1, 0].indexOf(queries_change) !== -1 && url_filters.length - filters.length === 0 && !history_changed) {
            queries_addition = queries_change === 1 || queries_change === 0 ? true : false;
            var is_range = false;
            var query_found = false;
            for (var i = 0, length = url_queries.length; i < length; i++) {
                filter = url_queries[i];
                key = Object.keys(filter)[0];
                obj = filter[key];
                is_range = false;
                if (key === "range") {
                    key = Object.keys(obj)[0];
                    obj = obj[key];
                    if (key.indexOf('items_count') === -1) {
                        is_range = true;
                    }
                    else {
                        obj = false;
                    }
                }
                else {
                    while (typeof(obj) === "object") {
                        if (key.indexOf('items_count') !== -1) {
                            obj = false;
                        }
                        else {
                            key = Object.keys(obj)[0];
                            obj = obj[key];
                        }
                    }
                }
                filter_last_qry = queries[i];
                if (filter_last_qry) {
                    key_last_qry = Object.keys(filter_last_qry)[0];
                    obj_last_qry = filter_last_qry[key_last_qry];
                }
                else {
                    key_last_qry = '';
                    obj_last_qry = '';

                }
                if (key_last_qry === "range") {
                    key_last_qry = Object.keys(obj_last_qry)[0];
                    obj_last_qry = obj_last_qry[key_last_qry];
                    if (key_last_qry.indexOf('items_count') === -1) {
                        is_range = true;
                    }
                    else {
                        obj_last_qry = false;
                    }
                }
                else {
                    while (typeof(obj_last_qry) === "object") {
                        if (key_last_qry.indexOf('items_count') !== -1) {
                            obj_last_qry = false;
                        }
                        else {
                            key_last_qry = Object.keys(obj_last_qry)[0];
                            obj_last_qry = obj_last_qry[key_last_qry];
                        }
                    }
                }

                if (key !== key_last_qry || is_range && queries_change === 0 || obj !== obj_last_qry && !is_range) {
                    if (!queries_addition) {
                        key = key_last_qry;
                         obj = obj_last_qry;
                    }
                    if (is_range) {
                        if (!queries_addition) {
                            if (obj.from === obj_last_qry.from && obj.to === obj_last_qry.to && queries_change === 0) {
                                continue;
                            }
                            $header = $("#" + key);
                            var rel = $header[0].getAttribute('eea_rel');
                            var $group = $("#facetview_group_" + rel);
                            $group.find('a').click();
                            query_found = true;
                            break;
                        }
                        else {
                            if (obj.from === obj_last_qry.from && obj.to === obj_last_qry.to && queries_change === 0) {
                                continue;
                            }
                            var from = obj['from'];
                            var to = obj['to'];
                            var valsobj = $('.facetview_tree').filter(function(idx, el) {
                                return el.getAttribute('rel') === key;
                            });
                            var vals_data = valsobj.data('values');
                            var first = vals_data[0];
                            var negative_value = false;
                            // check if first value is -1 in which case we need to reference the next value
                            // otherwise we end up with a wrong count when selecting the range values
                            if (first === -1) {
                                first = vals_data[1];
                                negative_value = true;
                            }
                            var values = [parseInt(from, 10) - first, parseInt(to, 10) - first];
                            if (negative_value) {
                                values = [values[0] + 1, values[1] + 1];
                            }
                            $header = $("#" + key);
                            $parent = $header.parent();
                            var $slider = $parent.find('.ui-slider');
                            $slider.slider('option', 'values', values);
                            query_found = true;
                            break;
                        }
                    }
                    if (key.indexOf('items_count') !== -1) {
                        var $exact_facetview = $exact_facetviews.filter("[href='" + key.substring(12, key.length) + "']");
                        $exact_facetview.click();
                        query_found = true;
                        break;
                    }

                    $header = $faceted_trees.find("[id=" + "'" + key + "']");
                    if (!$header.length) {
                        continue;
                    }
                    $parent = $header.parent();
                    $el = $parent.find('.jstree-container-ul').find('li').filter("[title='" + obj + "']");
                    $el = $el.find('a');
                    if ($el.length) {
                        $el.click();
                        query_found = true;
                        break;
                    }
                }
            }
            if (!query_found) {
                var queries_modified = check_filters(url_filters);
                if (!queries_modified) {
                    var $facetedview_clear = $(".facetview_clear");
                    var $clear_option, cleared_option;
                    $.each(current, function(key, vals) {
                        if (cleared_option) {
                            return;
                        }
                        $clear_option = $facetedview_clear.filter(function(idx, el){
                            return decodeURIComponent(el.href).indexOf(vals[0]) !== -1;
                        });
                        if ($clear_option.length) {
                            cleared_option = true;
                            $clear_option.click();
                        }
                    });
                }
            }
        } else if (Math.abs(url_queries.length - queries.length) !== 0 && Math.abs(url_filters.length - filters.length) !== 0 && !history_changed ||
                   url_queries.length - queries.length === 0 && url_filters.length - filters.length !== 0 && !history_changed) {
            // if -1 goes from any to all
            queries_addition = url_filters.length - filters.length === 1 ? true : false;
            var use_filters = url_filters.length - filters.length === -1 ? true : false;
            var iter_filters = url_filters;
            if (!queries_addition && use_filters) {
                iter_filters =  filters;
                filters = url_filters;
            }
            for (var i = 0, length = iter_filters.length; i < length; i++) {
                filter = iter_filters[i];
                key = Object.keys(filter)[0];
                obj = filter[key];
                while (typeof(obj) === "object") {
                    key = Object.keys(obj)[0];
                    obj = obj[key];
                }
                filter_last_qry = filters[i];
                if (filter_last_qry) {
                    key_last_qry = Object.keys(filter_last_qry)[0];
                    obj_last_qry = filter_last_qry[key_last_qry];
                    while (typeof(obj_last_qry) === "object") {
                        key_last_qry = Object.keys(obj_last_qry)[0];
                        obj_last_qry = obj_last_qry[key_last_qry];
                    }
                }
                else {
                    key_last_qry = undefined;
                }
                if (key !== key_last_qry) {
                    if (!queries_addition && !use_filters) {
                        key = key_last_qry;
                        obj = obj_last_qry;
                    }

                    $header = $faceted_trees.find("[id=" + "'" + key + "']");
                    if (!$header.length) {
                        continue;
                    }
                    $parent = $header.parent();
                    $el = $parent.find('.jstree-container-ul').find('li').filter("[title='" + obj + "']");
                    $el = $el.find('a');
                    var use_filter_selected;
                    if (!$el.length) {
                       use_filter_selected = $(".facetview_filterselected").filter(function(idx, el) {
                           return decodeURIComponent(el.href) === window.location.origin + '/' + obj;
                       });
                    }
                    if (!queries_addition && use_filters && !$el.length
                         || queries_addition && $el.length && $el.hasClass('jstree-clicked')
                         || queries_addition && use_filter_selected
                         || url_queries.length - queries.length > 0) {
                        $el = $parent.find('.facet_value_operator');
                        var $options = $el.find('option');
                        $options.filter(":selected")[0].value === "or" ?
                            $options.eq(0).prop('selected', true).change() :
                            $options.eq(1).prop('selected', true).change();
                    }
                    else {
                        $el = $parent.find('.jstree-container-ul').find('li').filter("[title='" + obj + "']");
                        $el = $el.find('a');
                        if ($el.length) {
                            $el.click();
                        }
                    }
                    break;
                }
            }
        }
        $.fn.facetview.options.from_popstate = false;
    };
    // modify size of inserted table scrollbar when resizing browser
    $(window).bindWithDelay("resize", function(){
        var facetview_results = document.getElementById("facetview_results");
        var $scrollbar;
        if (!facetview_results) {
            return;
        }
        $scrollbar = $(".abovescrollbar");
        $scrollbar.find('div').css('width', facetview_results.scrollWidth + 'px');
    }, 50);
});

