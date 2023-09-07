// ==UserScript==
// @name         TIP2 Fill the gap
// @namespace    tip2_fill_gap
// @version      0.3.1
// @description  Fill the gap if horary doesn't follow
// @author       pherjung
// @match        https://tip2.sbb.ch/*
// @require      https://cdn.jsdelivr.net/gh/CoeJoder/waitForKeyElements.js@v1.2/waitForKeyElements.js
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sbb.ch
// @copyright    GPL V3.0
// @grant        GM_addStyle
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
    var node = hours[0].closest('tip2-tour-zug-block').closest('div');
    for (let a=0; a < hours.length; a++) {
        if (a+1 == hours.length) {
            break;
        }

        var time_raw = durations[a].innerText.replace("'", "");
        time_raw = time_raw.replaceAll(' ', '');
        var time = time_raw.split('h ');
        var duration
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

        hour1.setTime(hour1.getTime() + duration);
        // Insert a new element
        // Check if it's less because planification does some shit
        if (hour1.getTime() < hour2.getTime()) {
            var copy = node.cloneNode(true);
            // Always remove this div, as sometimes copy isn't the expected one
            copy.querySelector('div > div').remove();
            // Need to remove time duration by foot if present
            var block = copy.getElementsByTagName('tip2-tour-zug-block-leistung');
            let i = 1;
            while (i < block.length) {
                console.log(i, block.length);
                block[i].remove();
            }
            // Always set the right classes
            copy.setAttribute('class', 'ng-star-inserted');
            var div = copy.querySelector('div');
            div.setAttribute('class', 'flex flex-col');
            copy.querySelector('.tip2-main-container-padding-no-h1').setAttribute('class', 'tip2-main-container-padding-no-h1 tip2-font-small');
            var bullet = copy.getElementsByClassName('point bullet-filled ng-star-inserted');
            var line = copy.getElementsByClassName('line-bottom line-solid');
            bullet[0].remove();
            line[0].remove();
            var dur_remove = copy.getElementsByClassName('zug-block-time-duration');
            var spans = copy.getElementsByTagName('span');
            var hour = String(hour1.getHours()).padStart(2, '0');
            var minutes = String(hour1.getMinutes()).padStart(2, '0');
            spans[0].innerText = hour+':'+minutes;
            var new_time = (hour2-hour1)/60000;
            spans[1].innerText = new_time+"'";
            spans[2].innerText = text;
            // remove (LF);
            spans[3].remove();
            var pos = hours[a].closest('tip2-tour-zug-block-leistung');
            var depot = copy.getElementsByClassName('lg:w-1/4');
            // remove depot name
            depot[0].remove();
            pos.after(copy);
            a++;
        }
    }
}
