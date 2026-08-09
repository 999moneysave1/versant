// =========================================================================
// ADVANCED ANTI-CHEATING & TAB-SWITCH LOCK GUARD SCRIPT
// =========================================================================
(function () {
    'use strict';

    window.tabSwitchCount = 0;
    window.isTestActive = false; // 🔓 डिफॉल्ट रूप से बंद रहेगा (OTP और सेटअप के समय)

    // 1. Disable Right-Click (Context Menu)
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    });

    // 2. Disable Text Selection & Highlighting
    document.addEventListener('selectstart', function (e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            return false;
        }
    });

    // 3. Block Copy, Cut, Paste, and Drag-Drop on ALL Elements
    const blockEvents = ['copy', 'cut', 'paste', 'drop', 'dragstart'];
    blockEvents.forEach(function (event) {
        document.addEventListener(event, function (e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, true);
    });

    // 4. Block Developer Tools & Inspection Shortcuts
    document.addEventListener('keydown', function (e) {
        if (e.keyCode === 123) { // F12
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+I, J, C
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
            e.preventDefault();
            return false;
        }

        // Ctrl+U / Cmd+Alt+U (View Source)
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }

        // Ctrl+S (Save Page)
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }

        // Ctrl+C, V, X (Copy/Paste Combinations)
        if ((e.ctrlKey || e.metaKey) && (e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88)) {
            e.preventDefault();
            return false;
        }

        // Alt+Tab / Ctrl+Tab Lock (केवल टेस्ट एक्टिव होने पर)
        if (window.isTestActive && (e.altKey || (e.ctrlKey && e.keyCode === 9))) {
            e.preventDefault();
            return false;
        }
    });

    // 5. Anti-Debugger Loop (Console Lock)
    setInterval(function () {
        if (window.isTestActive) {
            const start = performance.now();
            (function () {}["constructor"]("debugger")());
            const end = performance.now();
            if (end - start > 100) {
                window.location.reload();
            }
        }
    }, 1000);

    // 6. Disable PrintScreen Key
    document.addEventListener('keyup', function (e) {
        if (e.keyCode === 44 && window.isTestActive) { // PrintScreen
            navigator.clipboard.writeText('');
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Warning',
                    text: 'Screen Capture is strictly disabled during the examination.',
                    customClass: { popup: 'swal-mobile-size' }
                });
            }
        }
    });

    // 🟢 7. ANTI-TAB SWITCHING (केवल Section A चालू होने के बाद ही एक्टिव होगा)
    function handleTabSwitch() {
        if (!window.isTestActive) return; // OTP के समय छात्र बेझिझक जीमेल खोल सकता है

        window.tabSwitchCount++;

        if (window.tabSwitchCount === 1) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: '⚠️ Warning: Tab Switch Detected!',
                    text: 'You are not allowed to switch tabs during the exam. Next attempt will auto-submit your test!',
                    customClass: { popup: 'swal-mobile-size' }
                });
            } else {
                alert('WARNING: You switched tabs! Next attempt will auto-submit your test.');
            }
        } else if (window.tabSwitchCount >= 2) {
            window.isTestActive = false; // Disable lock before auto-submitting
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Test Terminated!',
                    text: 'Multiple tab switches detected. Your test is being auto-submitted.',
                    showConfirmButton: false,
                    timer: 2000
                }).then(() => {
                    if (typeof finishTest === 'function') finishTest();
                });
            } else {
                if (typeof finishTest === 'function') finishTest();
            }
        }
    }

    document.addEventListener('visibilitychange', function () {
        if (document.hidden && window.isTestActive) {
            handleTabSwitch();
        }
    });

    window.addEventListener('blur', function () {
        if (window.isTestActive) {
            handleTabSwitch();
        }
    });

})();