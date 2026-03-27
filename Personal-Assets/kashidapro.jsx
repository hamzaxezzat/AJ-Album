/*
ARABIC KASHIDA PRO - CEP HOST SCRIPT FOR PHOTOSHOP
Photoshop CC 2018+

Professional Arabic text justification using kashida (tatweel).
Built from scratch with precision diff-based algorithm.

Version: 1.0 Final - Photoshop CEP Edition
Created By: Othman Ahmed
Website: https://othmanahmed.online/

Features:
- Precision alignment (0.5% tolerance)
- Smart kashida distribution
- Respects Arabic typography rules
- Single undo operation
- Never overshoots target width

*/

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

var CONFIG = {
    scriptName: "Kashida Pro",
    version: "1.1 - Photoshop",
    website: "https://othmanahmed.online/",
    kashidaChar: "\u0640",
    tolerance: 0.005, // 0.5% tolerance
    maxIterations: 40,
    defaultIntensity: 100,
    defaultMaxPerWord: 1
};

// Global Kurdish mode flag
var KURDISH_MODE = false;

var ARABIC = {
    // الحروف المنفصلة (لا تأخذ كشيدة)
    disconnected: [
        '\u0627', '\u0623', '\u0625', '\u0622', // Alef variants
        '\u0671', // Alef Wasla
        '\u062F', '\u0630', // Dal, Dhal
        '\u0631', '\u0632', // Ra, Zay
        '\u0648', // Waw
        '\u0649', '\u0698' // Alef Maksura, Je
    ],

    // الأولوية 1: بعد س أو ص (الأفضل)
    priority1After: ['\u0633', '\u0634', '\u0635', '\u0636'], // س ش ص ض

    // الأولوية 2: قبل د، هـ، ة، ت مربوطة
    priority2Before: ['\u062F', '\u0647', '\u0629', '\u062A'], // د هـ ة ت

    // الأولوية 3: قبل ألف، كاف نهائية  
    priority3Before: ['\u0627', '\u0623', '\u0625', '\u0622', '\u0643'], // ا أ إ آ ك

    // الأولوية 4: قبل ف، ق، عين، واو نهائية
    priority4Before: ['\u0641', '\u0642', '\u0639', '\u0648'], // ف ق ع و

    // الحروف ذات الأسنان (جيد للكشيدة)
    toothedLetters: ['\u0628', '\u062A', '\u062B', '\u0646', '\u064A'], // ب ت ث ن ي

    // الحروف المدورة (جيد للكشيدة)  
    roundedLetters: ['\u0645', '\u0641', '\u0642'], // م ف ق

    // ممنوع بعدها (كاف)
    noKashidaAfter: ['\u0643'], // ك

    // ممنوع قبلها (لام، ياء نهائية)
    noKashidaBefore: ['\u0644', '\u064A'], // ل ي

    // كلمات ممنوعة - لا كشيدة فيها أبداً
    forbiddenWords: [
        'على', 'إلى', 'الى', 'إلا', 'الا', 'هذا', 'هذه', 'ذلك', 'تلك',
        'عن', 'من', 'ما', 'لا', 'أن', 'إن', 'أو', 'في', 'كل', 'كان',
        'له', 'لك', 'لي', 'بك', 'بي', 'هو', 'هي', 'أنا', 'نحن', 'هم'
    ],

    // Letters that extend beautifully with kashida
    extendable: [
        '\u0643', '\u0644', // Kaf, Lam
        '\u0633', '\u0634', // Seen, Sheen
        '\u0645', // Meem
        '\u0637', '\u0638', // Tah, Zah
        '\u0639', '\u063A', // Ain, Ghain
        '\u0635', '\u0636', // Sad, Dad
        '\u0642', // Qaf
        '\u064A', '\u0646', // Ya, Noon
        '\u062D', '\u062C', '\u062E', // Hah, Jeem, Khah
        '\u0647', // Heh
        '\u0628', '\u062A', '\u062B', // Beh, Teh, Theh
        '\u0641' // Feh
    ],

    // Kurdish-specific letters
    kurdishLetters: [
        '\u067E', // پ - PEH
        '\u0686', // چ - TCHEH
        '\u06A4', // ڤ - VEH
        '\u06AF', // گ - GAF
        '\u0695', // ڕ - REH with small v below
        '\u06B5', // ڵ - LAM with small v
        '\u06C6', // ۆ - OE
        '\u06CE', // ێ - YEH with small v
        '\u06D5'  // ە - AE
    ],

    kurdishExtendable: [
        '\u067E', // پ - PEH
        '\u0686', // چ - TCHEH
        '\u06A4', // ڤ - VEH
        '\u06AF', // گ - GAF
        '\u06B5', // ڵ - LAM with small v
        '\u06CE'  // ێ - YEH with small v
    ],

    kurdishNoExtend: [
        '\u06C6', // ۆ - OE
        '\u06D5', // ە - AE
        '\u0695'  // ڕ - REH with small v below
    ]
};

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function trim(str) {
    return str.replace(/^\s+|\s+$/g, '');
}

function isArabicChar(ch) {
    var code = ch.charCodeAt(0);
    return (code >= 0x0600 && code <= 0x06FF) ||
        (code >= 0x0750 && code <= 0x077F) ||
        (code >= 0x08A0 && code <= 0x08FF) ||
        (code >= 0xFB50 && code <= 0xFDFF) ||
        (code >= 0xFE70 && code <= 0xFEFF);
}

function hasArabic(text) {
    for (var i = 0; i < text.length; i++) {
        if (isArabicChar(text.charAt(i))) return true;
    }
    return false;
}

function inArray(arr, val) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === val) return true;
    }
    return false;
}

function isDisconnected(ch) {
    return inArray(ARABIC.disconnected, ch);
}

function isExtendable(ch) {
    return inArray(ARABIC.extendable, ch);
}

function isPunctuation(ch) {
    var punctuation = '.,;:!?\u060C\u061B\u061F-_()[]{}"\'\u00AB\u00BB\u2018\u2019\u201C\u201D';
    return punctuation.indexOf(ch) !== -1;
}

function isDiacritic(ch) {
    var code = ch.charCodeAt(0);
    return (code >= 0x064B && code <= 0x0652) ||
        (code >= 0x0653 && code <= 0x065F) ||
        (code === 0x0670);
}

function removeDiacritics(text) {
    return text.replace(/[\u064B-\u0652\u0653-\u065F\u0670]/g, '');
}

// ═══════════════════════════════════════════════════════════════
// PHOTOSHOP TEXT MEASUREMENT - HYBRID APPROACH
// ═══════════════════════════════════════════════════════════════

var textLayerCache = {};

function clearMeasurementCache() {
    textLayerCache = {};
}

// Direct measurement - ACCURATE but slow
function measureWidthAccurate(textLayer, text) {
    var original = textLayer.textItem.contents;
    try {
        textLayer.textItem.contents = text;
        var bounds = textLayer.bounds;
        var width = bounds[2].value - bounds[0].value;
        textLayer.textItem.contents = original;
        return width;
    } catch (e) {
        try { textLayer.textItem.contents = original; } catch (err) { }
        return 0;
    }
}

// Get cached text properties
function getTextProperties(textLayer) {
    var id = textLayer.id.toString();
    if (!textLayerCache[id]) {
        var fontSize = textLayer.textItem.size.value;

        textLayerCache[id] = {
            fontSize: fontSize,
            kashidaWidth: fontSize * 0.35,  // Approximate kashida width
            useAccurate: false  // Flag for when to use accurate measurement
        };
    }
    return textLayerCache[id];
}

// Fast measurement - for iterations only
function measureWidth(textLayer, text, forceAccurate) {
    // CRITICAL: Use accurate measurement for finding longest line
    if (forceAccurate) {
        return measureWidthAccurate(textLayer, text);
    }

    // Fast approximate measurement for iterations
    var props = getTextProperties(textLayer);
    var width = 0;

    for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        if (ch === CONFIG.kashidaChar) {
            width += props.kashidaWidth;
        } else if (ch === ' ') {
            width += props.fontSize * 0.3;
        } else if (isArabicChar(ch)) {
            width += props.fontSize * 0.55;
        } else {
            width += props.fontSize * 0.5;
        }
    }

    return width;
}


// ═══════════════════════════════════════════════════════════════
// KASHIDA PLACEMENT RULES (Same as Illustrator)
// ═══════════════════════════════════════════════════════════════

function canPlaceKashida(word, position, kurdishMode) {
    if (position < 0 || position >= word.length - 1) {
        return false;
    }

    var cleanWord = trim(word).toLowerCase();
    if (inArray(ARABIC.forbiddenWords, cleanWord)) {
        return false;
    }

    if (trim(word).length < 3) {
        return false;
    }

    var current = word.charAt(position);
    var next = word.charAt(position + 1);

    if (!isArabicChar(current) || !isArabicChar(next)) {
        return false;
    }

    if (isPunctuation(current) || isPunctuation(next)) {
        return false;
    }

    if (kurdishMode) {
        var kurdishYeh = '\u06CE';
        if (inArray(ARABIC.kurdishNoExtend, current)) {
            return false;
        }
        if (next === kurdishYeh && position === word.length - 2) {
            return false;
        }
    }

    if (isDisconnected(current)) {
        return false;
    }

    if (position === 0) {
        return false;
    }

    if (inArray(ARABIC.noKashidaAfter, current)) {
        return false;
    }

    var LAM = '\u0644';

    if (current === LAM) {
        return false;
    }

    if (next === LAM) {
        return false;
    }

    var isAlef = (current === '\u0627' || current === '\u0623' || current === '\u0625' || current === '\u0622');
    var nextIsAlef = (next === '\u0627' || next === '\u0623' || next === '\u0625' || next === '\u0622');

    if ((isAlef && next === LAM) || (current === LAM && nextIsAlef)) {
        return false;
    }

    if (next === '\u064A') {
        return false;
    }

    if (next === '\u0629') {
        return false;
    }

    if (word.length > 2 && position <= 2) {
        var first = removeDiacritics(word.charAt(0));
        var second = removeDiacritics(word.charAt(1));

        var startsWithAl = (
            (first === '\u0627' || first === '\u0623' || first === '\u0625' || first === '\u0622') &&
            second === '\u0644'
        );

        if (startsWithAl && position <= 2) {
            return false;
        }
    }

    return true;
}

function getPositionPriority(word, position, kurdishMode) {
    if (!canPlaceKashida(word, position, kurdishMode)) {
        return -1;
    }

    var current = word.charAt(position);
    var next = word.charAt(position + 1);
    var priority = 1;

    if (kurdishMode) {
        if (inArray(ARABIC.kurdishExtendable, current)) {
            priority += 12;
        }
        if (inArray(ARABIC.kurdishExtendable, next)) {
            priority += 7;
        }
    }

    if (inArray(ARABIC.priority1After, current)) {
        priority += 10;
    }

    if (inArray(ARABIC.priority2Before, next)) {
        priority += 8;
    }

    if (inArray(ARABIC.priority3Before, next)) {
        priority += 6;
    }

    if (inArray(ARABIC.priority4Before, next)) {
        priority += 4;
    }

    if (inArray(ARABIC.toothedLetters, current) && inArray(ARABIC.toothedLetters, next)) {
        priority += 3;
    }

    if (inArray(ARABIC.roundedLetters, current) && inArray(ARABIC.roundedLetters, next)) {
        priority += 3;
    }

    if (position === word.length - 2) {
        priority += 2;
    }

    if (isExtendable(current)) {
        priority += 2;
    }

    var distanceFromEdge = Math.min(position, word.length - position - 1);
    priority += distanceFromEdge * 0.1;

    return priority;
}

function findKashidaPositions(word, maxPositions, kurdishMode) {
    var candidates = [];

    for (var i = 0; i < word.length - 1; i++) {
        var priority = getPositionPriority(word, i, kurdishMode);
        if (priority > 0) {
            candidates.push({
                position: i,
                priority: priority
            });
        }
    }

    candidates.sort(function (a, b) {
        return b.priority - a.priority;
    });

    var positions = [];
    var limit = Math.min(maxPositions, candidates.length);
    for (var j = 0; j < limit; j++) {
        positions.push(candidates[j].position);
    }

    positions.sort(function (a, b) {
        return a - b;
    });

    return positions;
}

function insertKashida(word, positions, count) {
    if (positions.length === 0 || count <= 0) {
        return word;
    }

    var perPosition = Math.floor(count / positions.length);
    var remainder = count % positions.length;

    var result = [];
    var lastIndex = 0;

    for (var i = 0; i < positions.length; i++) {
        var pos = positions[i];
        result.push(word.substring(lastIndex, pos + 1));
        var kashidaCount = perPosition + (i < remainder ? 1 : 0);
        for (var k = 0; k < kashidaCount; k++) {
            result.push(CONFIG.kashidaChar);
        }
        lastIndex = pos + 1;
    }

    result.push(word.substring(lastIndex));

    return result.join('');
}

function justifyLine(textLayer, line, targetWidth, maxPerWord, skipFirstWords, kurdishMode) {
    var words = line.split(' ');
    var wordData = [];

    for (var i = 0; i < words.length; i++) {
        var word = words[i];

        if (skipFirstWords > 0 && i < skipFirstWords) {
            continue;
        }

        if (trim(word).length < 3 || !hasArabic(word)) {
            continue;
        }

        var positions = findKashidaPositions(word, maxPerWord, kurdishMode);
        if (positions.length > 0) {
            wordData.push({
                index: i,
                originalWord: word,
                positions: positions,
                currentKashida: 0,
                maxKashida: maxPerWord
            });
        }
    }

    if (wordData.length === 0) {
        return line;
    }

    var processed = words.slice();

    // ═══════════════════════════════════════════════════════════════
    // FIX: Start with ACCURATE measurement to establish correct baseline
    // Then use incremental tracking for speed
    // ═══════════════════════════════════════════════════════════════
    var currentLine = processed.join(' ');
    var currentWidth = measureWidth(textLayer, currentLine, true);  // ✅ ACCURATE initial measurement
    var gap = targetWidth - currentWidth;

    // Early exit if already close enough
    if (Math.abs(gap) < targetWidth * CONFIG.tolerance) {
        return line;
    }

    if (gap <= 0) {
        return line;
    }

    // Calculate total kashida needed (approximate)
    var props = getTextProperties(textLayer);
    var kashidaNeeded = Math.ceil(gap / props.kashidaWidth);

    // Distribute kashida evenly across all words
    var attempts = 0;
    var maxAttempts = Math.max(CONFIG.maxIterations * 2, kashidaNeeded + 20);  // Increased limit

    while (attempts < maxAttempts && gap > 0) {
        attempts++;

        // Find word with fewest kashida that can take more
        var bestWordIndex = -1;
        var minKashida = 999;

        for (var w = 0; w < wordData.length; w++) {
            var data = wordData[w];
            if (data.currentKashida < data.maxKashida && data.currentKashida < minKashida) {
                minKashida = data.currentKashida;
                bestWordIndex = w;
            }
        }

        // FIX: If no word can take more kashida, but we haven't reached target yet,
        // increase the limit for all words and continue!
        if (bestWordIndex === -1) {
            // Check if we still need more kashida
            var currentLine = processed.join(' ');
            var actualWidth = measureWidth(textLayer, currentLine, true);
            var remainingGap = targetWidth - actualWidth;

            // If we're still far from target (more than 1% away), increase limits
            if (remainingGap > targetWidth * 0.01) {
                // Increase maxKashida for all words by 1
                for (var i = 0; i < wordData.length; i++) {
                    wordData[i].maxKashida++;
                }
                // Try again with increased limits
                continue;
            } else {
                // We're close enough or at target, stop
                break;
            }
        }

        var wordInfo = wordData[bestWordIndex];
        wordInfo.currentKashida++;

        var newWord = insertKashida(
            wordInfo.originalWord,
            wordInfo.positions,
            wordInfo.currentKashida
        );

        processed[wordInfo.index] = newWord;

        // ═══════════════════════════════════════════════════════════════
        // FIX: Use accurate measurement like Illustrator, but optimize with periodic checks
        // Illustrator measures EVERY iteration. We measure every 5 iterations + when close
        // ═══════════════════════════════════════════════════════════════

        // Use approximate increment for speed
        currentWidth += props.kashidaWidth;
        gap = targetWidth - currentWidth;

        // Periodic accurate measurement (every 5 iterations) OR when getting close
        var needsAccurateCheck = (attempts % 5 === 0) || (gap < targetWidth * 0.3);

        if (needsAccurateCheck) {
            var testLine = processed.join(' ');
            var actualWidth = measureWidth(textLayer, testLine, true);  // Accurate measurement

            // If we overshot, revert and stop
            if (actualWidth > targetWidth) {
                wordInfo.currentKashida--;
                processed[wordInfo.index] = insertKashida(
                    wordInfo.originalWord,
                    wordInfo.positions,
                    wordInfo.currentKashida
                );
                break;
            }

            // Update with accurate measurement
            currentWidth = actualWidth;
            gap = targetWidth - currentWidth;

            // Stop if close enough (within 0.5% tolerance)
            if (Math.abs(gap) < targetWidth * CONFIG.tolerance) {
                break;
            }
        }
    }

    return processed.join(' ');
}

function reflowText(text, wordsPerLine) {
    if (wordsPerLine <= 0) {
        return text;
    }

    var cleanText = text.replace(/\r\n|\r|\n/g, ' ');
    cleanText = cleanText.replace(/\s+/g, ' ');
    cleanText = trim(cleanText);

    if (!cleanText) {
        return text;
    }

    var words = cleanText.split(' ');
    var lines = [];

    for (var i = 0; i < words.length; i += wordsPerLine) {
        var lineWords = [];
        for (var j = 0; j < wordsPerLine && (i + j) < words.length; j++) {
            lineWords.push(words[i + j]);
        }
        lines.push(lineWords.join(' '));
    }

    return lines.join('\r');
}


// ═══════════════════════════════════════════════════════════════
// PHOTOSHOP TEXT LAYER PROCESSING
// ═══════════════════════════════════════════════════════════════

function processTextLayer(textLayer, intensity, maxPerWord, wordsPerLine, skipFirstWords, skipLineWords, skipLastLine, kurdishMode) {
    try {
        // ═══════════════════════════════════════════════════════════════
        // CRITICAL OPTIMIZATION: Suspend history state for speed
        // This makes the entire operation feel instant!
        // ═══════════════════════════════════════════════════════════════
        var originalText = textLayer.textItem.contents;

        if (wordsPerLine > 0) {
            originalText = reflowText(originalText, wordsPerLine);
            textLayer.textItem.contents = originalText;
        }

        if (!hasArabic(originalText)) {
            return {
                success: false,
                error: "No Arabic text found"
            };
        }

        var lines = originalText.split(/\r\n|\n|\r/);

        if (lines.length <= 1) {
            return {
                success: false,
                error: "Need at least 2 lines for justification"
            };
        }

        // ═══════════════════════════════════════════════════════════════
        // CRITICAL: Use ACCURATE measurement to find longest line
        // This ensures we never add kashida to the longest line
        // ═══════════════════════════════════════════════════════════════
        var targetWidth = 0;
        var longestLineIndex = -1;

        for (var i = 0; i < lines.length; i++) {
            if (trim(lines[i]).length === 0) {
                continue;
            }

            var width = measureWidth(textLayer, lines[i], true);  // forceAccurate = true
            if (width > targetWidth) {
                targetWidth = width;
                longestLineIndex = i;
            }
        }

        if (targetWidth <= 0) {
            return {
                success: false,
                error: "Cannot measure text width"
            };
        }

        var adjustedTarget = targetWidth * (intensity / 100.0);

        var processed = lines.slice();
        var totalKashida = 0;
        var linesModified = 0;

        // ═══════════════════════════════════════════════════════════════
        // DEBUG: Log longest line info
        // ═══════════════════════════════════════════════════════════════
        // Commented out for production, uncomment to debug:
        // $.writeln("Longest line index: " + longestLineIndex);
        // $.writeln("Longest line: " + lines[longestLineIndex]);
        // $.writeln("Target width: " + targetWidth);
        // $.writeln("Adjusted target: " + adjustedTarget);

        for (var j = 0; j < processed.length; j++) {
            // Skip empty lines
            if (trim(processed[j]).length === 0) {
                continue;
            }

            // CRITICAL: Skip the longest line - it's our target!
            if (j === longestLineIndex) {
                continue;
            }

            if (skipLastLine && j === lines.length - 1) {
                continue;
            }

            if (skipLineWords > 0) {
                var lineWordCount = processed[j].split(' ').length;
                if (lineWordCount <= skipLineWords) {
                    continue;
                }
            }

            var originalLine = processed[j];
            var justifiedLine = justifyLine(textLayer, originalLine, adjustedTarget, maxPerWord, skipFirstWords, kurdishMode);

            if (justifiedLine !== originalLine) {
                var kashidaCount = 0;
                for (var c = 0; c < justifiedLine.length; c++) {
                    if (justifiedLine.charAt(c) === CONFIG.kashidaChar) {
                        kashidaCount++;
                    }
                }

                processed[j] = justifiedLine;
                totalKashida += kashidaCount;
                linesModified++;
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // FINAL SAFETY CHECK: Ensure longest line is unchanged
        // ═══════════════════════════════════════════════════════════════
        if (longestLineIndex >= 0 && longestLineIndex < processed.length) {
            processed[longestLineIndex] = lines[longestLineIndex];
        }

        textLayer.textItem.contents = processed.join('\r');

        return {
            success: true,
            linesProcessed: lines.length,
            linesModified: linesModified,
            kashidaAdded: totalKashida
        };

    } catch (e) {
        return {
            success: false,
            error: e.toString()
        };
    }
}

function getAllTextLayers(layerSet) {
    var textLayers = [];

    for (var i = 0; i < layerSet.layers.length; i++) {
        var layer = layerSet.layers[i];

        if (layer.typename == "ArtLayer" && layer.kind == LayerKind.TEXT) {
            textLayers.push(layer);
        } else if (layer.typename == "LayerSet") {
            // Recursively get text layers from layer groups
            var nestedLayers = getAllTextLayers(layer);
            for (var j = 0; j < nestedLayers.length; j++) {
                textLayers.push(nestedLayers[j]);
            }
        }
    }

    return textLayers;
}

function processSelection(intensity, maxPerWord, wordsPerLine, skipFirstWords, skipLineWords, skipLastLine, kurdishMode) {
    if (!app.documents.length) {
        return {
            success: false,
            error: "No document open"
        };
    }

    var doc = app.activeDocument;
    var layers = [];

    // Try to get the active layer if it's a text layer
    try {
        if (doc.activeLayer && doc.activeLayer.typename == "ArtLayer" && doc.activeLayer.kind == LayerKind.TEXT) {
            layers.push(doc.activeLayer);
        }
    } catch (e) {
        // Active layer might not be accessible, continue to get all text layers
    }

    // If no active text layer, get all text layers in document
    if (layers.length === 0) {
        layers = getAllTextLayers(doc);
    }

    if (layers.length === 0) {
        return {
            success: false,
            error: "No text layer found. Please create a text layer with Arabic text."
        };
    }

    var stats = {
        success: true,
        totalFrames: layers.length,
        processedFrames: 0,
        totalLines: 0,
        totalKashida: 0,
        errors: []
    };

    // ═══════════════════════════════════════════════════════════════
    // FIX: Wrap entire operation in single history state for ONE UNDO
    // This makes Ctrl+Z undo everything in one step!
    // ═══════════════════════════════════════════════════════════════
    doc.suspendHistory("Apply Kashida", "processKashidaLayers(layers, stats, intensity, maxPerWord, wordsPerLine, skipFirstWords, skipLineWords, skipLastLine, kurdishMode)");

    return stats;
}

// Helper function that runs inside suspended history
function processKashidaLayers(layers, stats, intensity, maxPerWord, wordsPerLine, skipFirstWords, skipLineWords, skipLastLine, kurdishMode) {
    for (var i = 0; i < layers.length; i++) {
        var result = processTextLayer(layers[i], intensity, maxPerWord, wordsPerLine, skipFirstWords, skipLineWords, skipLastLine, kurdishMode);

        if (result.success) {
            stats.processedFrames++;
            stats.totalLines += result.linesModified;
            stats.totalKashida += result.kashidaAdded;
        } else {
            stats.errors.push("Layer " + (i + 1) + ": " + result.error);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// REFLOW TEXT ONLY
// ═══════════════════════════════════════════════════════════════

function reflowTextSelection(wordsPerLine) {
    try {
        if (!app.documents.length) {
            return JSON.stringify({
                success: false,
                error: "Please open a document first"
            });
        }

        var doc = app.activeDocument;
        var layers = [];

        try {
            if (doc.activeLayer && doc.activeLayer.typename == "ArtLayer" && doc.activeLayer.kind == LayerKind.TEXT) {
                layers.push(doc.activeLayer);
            }
        } catch (e) { }

        if (layers.length === 0) {
            layers = getAllTextLayers(doc);
        }

        if (layers.length === 0) {
            return JSON.stringify({
                success: false,
                error: "No text layer found"
            });
        }

        var stats = {
            success: true,
            totalFrames: layers.length,
            processedFrames: 0
        };

        for (var i = 0; i < layers.length; i++) {
            try {
                var layer = layers[i];
                var originalText = layer.textItem.contents;
                var reflowedText = reflowText(originalText, wordsPerLine);
                layer.textItem.contents = reflowedText;
                stats.processedFrames++;
            } catch (e) {
                // Continue with other layers
            }
        }

        return JSON.stringify(stats);

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// REMOVE KASHIDA FUNCTION
// ═══════════════════════════════════════════════════════════════

function removeKashidaFromSelection() {
    try {
        if (!app.documents.length) {
            return JSON.stringify({
                success: false,
                error: "Please open a document first"
            });
        }

        var doc = app.activeDocument;
        var layers = [];

        try {
            if (doc.activeLayer && doc.activeLayer.typename == "ArtLayer" && doc.activeLayer.kind == LayerKind.TEXT) {
                layers.push(doc.activeLayer);
            }
        } catch (e) { }

        if (layers.length === 0) {
            layers = getAllTextLayers(doc);
        }

        if (layers.length === 0) {
            return JSON.stringify({
                success: false,
                error: "No text layer found"
            });
        }

        var stats = {
            success: true,
            totalFrames: layers.length,
            processedFrames: 0,
            kashidaRemoved: 0
        };

        for (var i = 0; i < layers.length; i++) {
            try {
                var layer = layers[i];
                var originalText = layer.textItem.contents;
                var kashidaCount = 0;

                for (var j = 0; j < originalText.length; j++) {
                    if (originalText.charAt(j) === CONFIG.kashidaChar) {
                        kashidaCount++;
                    }
                }

                var cleanedText = originalText.split(CONFIG.kashidaChar).join('');
                layer.textItem.contents = cleanedText;

                stats.processedFrames++;
                stats.kashidaRemoved += kashidaCount;
            } catch (e) {
                // Continue with other layers
            }
        }

        return JSON.stringify(stats);

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// TASHKEEL (DIACRITICS) MANAGEMENT
// ═══════════════════════════════════════════════════════════════

var TASHKEEL_STORAGE = {};

function getLayerID(layer) {
    return layer.id.toString();
}

function createDiacriticsMap(text) {
    var map = [];
    var baseLetterIndex = 0;

    for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);

        if (isDiacritic(ch)) {
            map.push({
                baseLetterIndex: baseLetterIndex - 1,
                diacritic: ch,
                originalPosition: i
            });
        } else if (isArabicChar(ch)) {
            baseLetterIndex++;
        }
    }

    return map;
}

function restoreDiacriticsToText(cleanText, map) {
    if (!map || map.length === 0) return cleanText;

    var result = '';
    var baseLetterIndex = 0;

    for (var i = 0; i < cleanText.length; i++) {
        var ch = cleanText.charAt(i);
        result += ch;

        if (isArabicChar(ch)) {
            for (var j = 0; j < map.length; j++) {
                if (map[j].baseLetterIndex === baseLetterIndex) {
                    result += map[j].diacritic;
                }
            }
            baseLetterIndex++;
        }
    }

    return result;
}

function removeTashkeel() {
    try {
        if (!app.documents.length) {
            return JSON.stringify({
                success: false,
                error: "Please open a document first"
            });
        }

        var doc = app.activeDocument;
        var layers = [];

        try {
            if (doc.activeLayer && doc.activeLayer.typename == "ArtLayer" && doc.activeLayer.kind == LayerKind.TEXT) {
                layers.push(doc.activeLayer);
            }
        } catch (e) { }

        if (layers.length === 0) {
            layers = getAllTextLayers(doc);
        }

        if (layers.length === 0) {
            return JSON.stringify({
                success: false,
                error: "No text layer selected or found"
            });
        }

        var stats = {
            success: true,
            totalFrames: layers.length,
            processedFrames: 0,
            diacriticsRemoved: 0
        };

        for (var i = 0; i < layers.length; i++) {
            try {
                var layer = layers[i];
                var layerID = getLayerID(layer);
                var originalText = layer.textItem.contents;

                var map = createDiacriticsMap(originalText);

                TASHKEEL_STORAGE[layerID] = {
                    originalText: originalText,
                    diacriticsMap: map
                };

                var cleanText = removeDiacritics(originalText);
                layer.textItem.contents = cleanText;

                stats.processedFrames++;
                stats.diacriticsRemoved += map.length;
            } catch (e) {
                // Continue with other layers
            }
        }

        return JSON.stringify(stats);

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}

function restoreTashkeel() {
    try {
        if (!app.documents.length) {
            return JSON.stringify({
                success: false,
                error: "Please open a document first"
            });
        }

        var doc = app.activeDocument;
        var layers = [];

        try {
            if (doc.activeLayer && doc.activeLayer.typename == "ArtLayer" && doc.activeLayer.kind == LayerKind.TEXT) {
                layers.push(doc.activeLayer);
            }
        } catch (e) { }

        if (layers.length === 0) {
            layers = getAllTextLayers(doc);
        }

        if (layers.length === 0) {
            return JSON.stringify({
                success: false,
                error: "No text layer selected or found"
            });
        }

        var stats = {
            success: true,
            totalFrames: layers.length,
            processedFrames: 0,
            diacriticsRestored: 0
        };

        for (var i = 0; i < layers.length; i++) {
            try {
                var layer = layers[i];
                var layerID = getLayerID(layer);

                if (TASHKEEL_STORAGE[layerID]) {
                    var currentText = layer.textItem.contents;
                    var cleanCurrent = removeDiacritics(currentText);
                    var map = TASHKEEL_STORAGE[layerID].diacriticsMap;

                    var restoredText = restoreDiacriticsToText(cleanCurrent, map);
                    layer.textItem.contents = restoredText;

                    stats.processedFrames++;
                    stats.diacriticsRestored += map.length;
                }
            } catch (e) {
                // Continue with other layers
            }
        }

        return JSON.stringify(stats);

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}

function restoreSelected() {
    try {
        if (!app.documents.length) {
            return JSON.stringify({
                success: false,
                error: "Please open a document first"
            });
        }

        var doc = app.activeDocument;
        var layers = [];

        try {
            if (doc.activeLayer && doc.activeLayer.typename == "ArtLayer" && doc.activeLayer.kind == LayerKind.TEXT) {
                layers.push(doc.activeLayer);
            }
        } catch (e) { }

        if (layers.length === 0) {
            layers = getAllTextLayers(doc);
        }

        if (layers.length === 0) {
            return JSON.stringify({
                success: false,
                error: "No text layer selected or found"
            });
        }

        var stats = {
            success: true,
            totalFrames: layers.length,
            processedFrames: 0,
            restoredToOriginal: 0,
            kashidaRemoved: 0
        };

        for (var i = 0; i < layers.length; i++) {
            try {
                var layer = layers[i];
                var layerID = getLayerID(layer);

                if (TASHKEEL_STORAGE[layerID]) {
                    layer.textItem.contents = TASHKEEL_STORAGE[layerID].originalText;
                    delete TASHKEEL_STORAGE[layerID];
                    stats.restoredToOriginal++;
                } else {
                    var currentText = layer.textItem.contents;
                    var kashidaCount = 0;
                    for (var j = 0; j < currentText.length; j++) {
                        if (currentText.charAt(j) === CONFIG.kashidaChar) {
                            kashidaCount++;
                        }
                    }
                    var cleanText = currentText.split(CONFIG.kashidaChar).join('');
                    layer.textItem.contents = cleanText;
                    stats.kashidaRemoved += kashidaCount;
                }

                stats.processedFrames++;
            } catch (e) {
                // Continue with other layers
            }
        }

        return JSON.stringify(stats);

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// CEP INTERFACE FUNCTION
// ═══════════════════════════════════════════════════════════════

function processKashidaSelection(params) {
    try {
        if (!app.documents.length) {
            return JSON.stringify({
                success: false,
                error: "Please open a document first"
            });
        }

        var intensity = params.intensity || CONFIG.defaultIntensity;
        var maxPerWord = params.maxPerWord || CONFIG.defaultMaxPerWord;
        var wordsPerLine = params.wordsPerLine || 0;
        var skipEnabled = params.skipEnabled || false;
        var skipFirstWords = (skipEnabled && params.skipFirstWords) ? params.skipFirstWords : 0;
        var skipLineWords = (skipEnabled && params.skipLineWords) ? params.skipLineWords : 0;
        var skipLastLine = skipEnabled ? (params.skipLastLine || false) : false;
        var kurdishMode = params.kurdishMode || false;

        var result = processSelection(intensity, maxPerWord, wordsPerLine, skipFirstWords, skipLineWords, skipLastLine, kurdishMode);

        return JSON.stringify(result);

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}


// ═══════════════════════════════════════════════════════════════
// TEST FUNCTION
// ═══════════════════════════════════════════════════════════════

function testConnection() {
    return JSON.stringify({
        success: true,
        message: "Connection successful!",
        app: app.name,
        version: app.version,
        documentsOpen: app.documents.length
    });
}
