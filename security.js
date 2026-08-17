// =========================================================================
// ADVANCED ANTI-CHEATING, FULL DEVTOOLS BLOCK & TAB-SWITCH GUARD
// =========================================================================
(function () {
    'use strict';

    window.tabSwitchCount = 0;
    window.isTestActive = false; // 🔓 डिफ़ॉल्ट रूप से बंद (OTP/सेटअप के समय)

    // 🚫 1. Kill Console Commands (Anti-Tampering)
    try {
        const noop = () => {};
        ['log', 'debug', 'info', 'warn', 'error', 'table', 'clear'].forEach(method => {
            console[method] = noop;
        });
    } catch (e) {}

    // 🚫 2. Disable Right-Click (Context Menu) - Global
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }, true);

    // 🚫 3. Disable Text Selection & Highlighting (Inputs Allowed)
    document.addEventListener('selectstart', function (e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            return false;
        }
    });

    // 🚫 4. Block Copy, Cut, Paste, and Drag-Drop
    const blockEvents = ['copy', 'cut', 'paste', 'drop', 'dragstart'];
    blockEvents.forEach(function (event) {
        document.addEventListener(event, function (e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, true);
    });

    // 🚫 5. Block All Keyboard Inspection Shortcuts & Tools (Modern e.key matching)
    document.addEventListener('keydown', function (e) {
        const key = e.key ? e.key.toUpperCase() : '';

        // F12 Key
        if (key === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+I, J, C, K (DevTools & Console)
        if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K', 'S'].includes(key)) {
            e.preventDefault();
            return false;
        }

        // Mac Shortcuts (Cmd+Option+I/J/C/U)
        if (e.metaKey && e.altKey && ['I', 'J', 'C', 'U'].includes(key)) {
            e.preventDefault();
            return false;
        }

        // Ctrl+U / Cmd+U (View Source)
        if ((e.ctrlKey || e.metaKey) && key === 'U') {
            e.preventDefault();
            return false;
        }

        // Ctrl+S / Cmd+S (Save Page)
        if ((e.ctrlKey || e.metaKey) && key === 'S') {
            e.preventDefault();
            return false;
        }

        // Ctrl+P / Cmd+P (Print Page)
        if ((e.ctrlKey || e.metaKey) && key === 'P') {
            e.preventDefault();
            return false;
        }

        // Alt+Tab / Ctrl+Tab / Alt+F4 Locks during active test
        if (window.isTestActive) {
            if (e.altKey || (e.ctrlKey && (key === 'TAB' || e.keyCode === 9))) {
                e.preventDefault();
                return false;
            }
        }
    }, true);

    // 🚫 6. Continuous DevTools Detection & Infinite Debugger Loop
    // (यदि कोई 3-Dot Browser Menu से भी Inspect खोलेगा, तो स्क्रीन तुरंत फ्रीज हो जाएगी)
    setInterval(function () {
        const start = performance.now();
        (function () {}["constructor"]("debugger")());
        const end = performance.now();

        // 100ms से ज़्यादा रुकावट का मतलब है कि Inspect खुला हुआ है
        if (end - start > 100) {
            if (window.isTestActive) {
                document.body.innerHTML = `
                    <div style="background:#0f172a; color:#ef4444; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center; padding:20px;">
                        <h1 style="font-size:2rem; font-weight:bold; margin-bottom:10px;">⚠️ DevTools Blocked!</h1>
                        <p style="color:#cbd5e1; font-size:1.1rem;">Developer Tools are strictly prohibited during the exam.</p>
                        <p style="color:#94a3b8; font-size:0.9rem; margin-top:20px;">Close Inspect Element and reload the page.</p>
                    </div>`;
                window.location.reload();
            }
        }
    }, 500);

    // 🚫 7. Window Dimension Tracking (Detects Docked DevTools Panel)
    window.addEventListener('resize', function () {
        const threshold = 160;
        const widthDiff = window.outerWidth - window.innerWidth > threshold;
        const heightDiff = window.outerHeight - window.innerHeight > threshold;

        if ((widthDiff || heightDiff) && window.isTestActive) {
            console.clear();
        }
    });

    // 🚫 8. Disable Mobile Long-Press Callout & Tap Highlight (CSS Injection)
    const antiSelectStyle = document.createElement('style');
    antiSelectStyle.innerHTML = `
        * {
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            -khtml-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
        }
        input, textarea {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
    `;
    document.head.appendChild(antiSelectStyle);

    // 🚫 9. Disable PrintScreen Key & Clear Clipboard
    document.addEventListener('keyup', function (e) {
        if ((e.key === 'PrintScreen' || e.keyCode === 44) && window.isTestActive) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText('');
            }
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

    // 🟢 10. Anti-Tab Switching (Active only when Section A starts)
    function handleTabSwitch() {
        if (!window.isTestActive) return;

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
            window.isTestActive = false; // Submitting phase
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
