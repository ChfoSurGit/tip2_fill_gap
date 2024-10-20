// ==UserScript==
// @name         TIP2 Fill the gap
// @namespace    tip2_fill_gap
// @version      0.4
// @description  Fill the gap if horary doesn't follow
// @author       pherjung
// @match        https://tip2.sbb.ch/*
// @require      https://cdn.jsdelivr.net/gh/CoeJoder/waitForKeyElements.js@v1.2/waitForKeyElements.js
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sbb.ch
// @copyright    GPL V3.0
// @grant        GM_addStyle
// @updateURL    https://github.com/pherjung/tip2_fill_gap/raw/refs/heads/main/TIP2%20Fill%20the%20gap.user.js
// @downloadURL  https://github.com/pherjung/tip2_fill_gap/raw/refs/heads/main/TIP2%20Fill%20the%20gap.user.js
// ==/UserScript==

(function(open) {
    XMLHttpRequest.prototype.open = function() {
        this.addEventListener("readystatechange", function() {
            waitForKeyElements("tip2-tour-zug-block-row-template", addGap);
        });
        open.apply(this, arguments);
    };
})(XMLHttpRequest.prototype.open);

(function() {
    'use strict';
    waitForKeyElements("tip2-tour-zug-block-row-template", addGap);
})();

function addGap() {
    var lang = document.querySelector('tip2-go-back').innerText;
    lang = lang.split(' ')[0]
    var text;
    // Doesn't work if the language is changed without any refresh
    switch (lang) {
        case "Zurück":
            text = "Leerzeit";
            break;
        case "Retour":
            text = "Temps libre";
            break;
        case "Tornare":
            text = "Tempo di inattività";
            break;
    }
    var hours = document.getElementsByClassName('tip2-font-bold p-0');
    var start_hour_txt = hours[0].innerText.replaceAll(' ', '');
    var start_hour = new Date('2023-01-01 '+start_hour_txt);
    var durations = document.getElementsByClassName('zug-block-time-duration');
    // Copy a standard element to reuse it
    var node = hours[0].closest('tip2-tour-zug-block');
    var skeleton = node.cloneNode(true);
    // Prepare skeleton that will be reuse to insert my elements
    var skeleton_leistung = skeleton.getElementsByTagName('tip2-tour-zug-block-leistung');
    // keep only one element tip2-tour-zug-block-leistung
    while (1 < skeleton_leistung.length) {
        skeleton_leistung[1].remove();
    }
    var bullet = skeleton.getElementsByClassName('point bullet-filled ng-star-inserted');
    bullet[0].remove();
    var line = skeleton.getElementsByClassName('line-bottom line-solid');
    line[0].remove();
    var depot = skeleton.getElementsByClassName('lg:w-1/4');
    // remove depot name
    depot[0].remove();

    for (let a=0; a < hours.length; a++) {
        if (a+1 == hours.length) {
            break;
        }

        var time_raw = durations[a].innerText.replace("'", "");
        time_raw = time_raw.replaceAll(' ', '');
        var time = time_raw.split('h ');
        var duration
        // If more than 1, it means it's > 60'
        if (time.length > 1) {
            duration = time[0]*3600000+time[1]*60000;
        } else {
            duration = time[0]*60000;
        }

        var hour2_txt = hours[a+1].innerText.replaceAll(' ', '');
        var hour1_txt = hours[a].innerText.replaceAll(' ', '');
        var hour2 = new Date('2023-01-01 '+hour2_txt);
        var hour1 = new Date('2023-01-01 '+hour1_txt);
        // Sometimes next work has the same hour as the previous
        // Time is in milliseconds
        var diff = hour2-hour1;
        if (diff === 0) {
            continue;
        }
        // If it's a negative value, it means that hours2 is the next day
        if (diff < 0) {
            hour2.setDate(2);
            diff = hour2-hour1;
        }
        if (hour1 < start_hour) {
            hour1.setDate(2);
            hour2.setDate(2);
        }

        var expected_hour1 = hour1;
        expected_hour1.setTime(expected_hour1.getTime() + duration);
        // Check if it's less because planification does some shit
        if (expected_hour1.getTime() < hour2.getTime()) {
            // Insert a new element
            var copy = skeleton.cloneNode(true);
            var spans = copy.getElementsByTagName('span');
            var hour = String(expected_hour1.getHours()).padStart(2, '0');
            var minutes = String(expected_hour1.getMinutes()).padStart(2, '0');
            spans[0].innerText = hour+':'+minutes;
            var new_time = (hour2-expected_hour1)/60000;
            spans[1].innerText = new_time+"'";
            spans[2].innerText = text;
            var pos = hours[a].closest('tip2-tour-zug-block');
            pos.after(copy);
            a++;
        }
    }
}
