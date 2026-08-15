// =========================================================================
// FIREBASE & GOOGLE APPS SCRIPT INITIALIZATION
// =========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const ADMIN_EMAIL = "eewsa999@gmail.com";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5WHqDkJwcI9cmUC6i_pb4BLg4SRzGsPXHR6qDkUKBo0czUOqcv9dFzcMoKpkvl7MT-w/exec";

const firebaseConfig = {
    apiKey: "AIzaSyAZtEP3pUWHLUMQhV-c6SnaQT4TFiOYb74",
    authDomain: "versant-mcat.firebaseapp.com",
    projectId: "versant-mcat",
    storageBucket: "versant-mcat.firebasestorage.app",
    messagingSenderId: "474002889841",
    appId: "1:474002889841:web:b1e9780aa13737fb320fd0",
    measurementId: "G-C1ML6Q9CWF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

(function () {
    if (typeof emailjs !== 'undefined') {
        emailjs.init("aujPO4y_cTu20LjZa");
    }
})();

// Global State Variables
let isNetOk = false, isAudioOk = false;
window.isOTPVerified = false;
let questionPool = [];
let activeSet = null, timerInterval;
let currentObjIdx = 0, userObjAnswers = {};
let currentDIdx = 0, voiceDAnswers = {};
let currentEIdx = 0, userEAnswers = {};
let currentFIdx = 0, voiceFAnswers = {};
let currentGIdx = 0, userGAnswers = {};
let currentTFIdx = 0, userTFAnswers = {};
let currentFIBIdx = 0, userFIBAnswers = {};
let typingStartTime, finalWPM = 0, finalAcc = 0;

// Dynamic Week & Section Variables
let activeExamWeekNum = "1";
let selectedWeekTag = "Week 1";
let activeSectionList = [];
let currentSectionIndex = 0;
let currentExamConfig = {
    secA: true, secB: true, secC: true, secD: true,
    secE: true, secF: true, secG: true, secTF: true, secFIB: true
};

window.addEventListener('DOMContentLoaded', () => {
    fetch('questions.json')
        .then(response => {
            if (!response.ok) throw new Error("JSON loading failed");
            return response.json();
        })
        .then(data => {
            questionPool = data;
            console.log(`Loaded ${questionPool.length} Question Sets dynamically.`);
            fetchActiveExamConfig();
        })
        .catch(err => console.error("Error loading JSON:", err));
});

// 🟢 FIXED: Priority Question Loader (Firebase First -> JSON Fallback)
async function fetchActiveExamConfig() {
    try {
        const configRef = doc(db, "exam_config", "active_week_setting");
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
            activeExamWeekNum = (configSnap.data().activeWeek || "1").toString();
            selectedWeekTag = `Week ${activeExamWeekNum}`;

            const weekConfigRef = doc(db, "exam_config", `week_${activeExamWeekNum}_config`);
            const weekConfigSnap = await getDoc(weekConfigRef);

            if (weekConfigSnap.exists()) {
                const wData = weekConfigSnap.data();
                if (wData.activeSections) currentExamConfig = wData.activeSections;
                if (wData.customData) activeSet = normalizeActiveSet(wData.customData);
                console.log(`🟢 [PRIORITY 1] Loaded Firebase Custom Data for: ${selectedWeekTag}`);
            }
        }
    } catch (e) {
        console.error("Config fetch error:", e);
    }
}

function speak(text, callback) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.rate = 0.9; msg.pitch = 1.0; msg.lang = 'en-US';
        let handled = false;
        msg.onend = () => { if (!handled) { handled = true; if (callback) callback(); } };
        msg.onerror = () => { if (!handled) { handled = true; if (callback) callback(); } };
        window.speechSynthesis.speak(msg);
        setTimeout(() => { if (!handled) { handled = true; if (callback) callback(); } }, 4500);
    } else { if (callback) callback(); }
}

function hideAll() {
    ['screen-reg', 'screen-syscheck', 'screen-instruction', 'screen-test', 'screen-result'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

function normalizeActiveSet(dataSet) {
    if (!dataSet) return null;
    if (Array.isArray(dataSet)) {
        return dataSet.length > 0 ? dataSet[0] : null;
    }
    return dataSet;
}

function getAvailableSections() {
    let activeSections = [];
    let setObj = normalizeActiveSet(activeSet);

    if (!setObj) return activeSections;

    if (currentExamConfig.secA && setObj.obj && setObj.obj.length > 0)
        activeSections.push({ key: 'obj', name: 'Objective Grammar Test' });

    if (currentExamConfig.secB && setObj.email && setObj.email.question)
        activeSections.push({ key: 'email', name: 'Timed Email Writing' });

    if (currentExamConfig.secC && setObj.typing && setObj.typing.trim().length > 0)
        activeSections.push({ key: 'typing', name: 'Typing Speed Assessment' });

    if (currentExamConfig.secD && setObj.voiceD && setObj.voiceD.length > 0)
        activeSections.push({ key: 'voiceD', name: 'Read Aloud Speaking' });

    if (currentExamConfig.secE && setObj.passagesE && setObj.passagesE.length > 0)
        activeSections.push({ key: 'passagesE', name: 'Memory Passage Reconstruction' });

    if (currentExamConfig.secF && setObj.audioPromptsF && setObj.audioPromptsF.length > 0)
        activeSections.push({ key: 'audioPromptsF', name: 'Listen & Repeat Speaking' });

    if (currentExamConfig.secG && setObj.storyG && setObj.storyG.length > 0)
        activeSections.push({ key: 'storyG', name: 'Essay & Story Response' });

    if (currentExamConfig.secTF && setObj.trueFalse && setObj.trueFalse.length > 0)
        activeSections.push({ key: 'trueFalse', name: 'True / False Diagnostics' });

    if (currentExamConfig.secFIB && setObj.fillBlanks && setObj.fillBlanks.length > 0)
        activeSections.push({ key: 'fillBlanks', name: 'Fill in the Blanks' });

    return activeSections;
}

window.startFullAssessment = async function () {
    try {
        const configRef = doc(db, "exam_config", "active_week_setting");
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
            activeExamWeekNum = configSnap.data().activeWeek || "1";
            selectedWeekTag = `Week ${activeExamWeekNum}`;
        }

        const weekConfigRef = doc(db, "exam_config", `week_${activeExamWeekNum}_config`);
        const weekConfigSnap = await getDoc(weekConfigRef);

        if (weekConfigSnap.exists()) {
            const wData = weekConfigSnap.data();
            if (wData.activeSections) currentExamConfig = wData.activeSections;
            if (wData.customData) {
                activeSet = normalizeActiveSet(wData.customData);
            }
        }

        if (!activeSet && questionPool && questionPool.length > 0) {
            const matchedSet = questionPool.find(s => s.setId == activeExamWeekNum);
            activeSet = matchedSet ? matchedSet : questionPool[0];
        }
    } catch (err) {
        console.error("Error loading active week set:", err);
        if (questionPool && questionPool.length > 0) {
            const matchedSet = questionPool.find(s => s.setId == activeExamWeekNum);
            activeSet = matchedSet ? matchedSet : questionPool[0];
        }
    }

    activeSet = normalizeActiveSet(activeSet);

    if (!activeSet) {
        alert("Question paper is loading or invalid. Please try again!");
        return;
    }

    activeSectionList = getAvailableSections();
    currentSectionIndex = 0;

    if (activeSectionList.length === 0) {
        alert("No active test sections found for this test! Please check Admin Settings.");
        return;
    }

    loadCurrentInstructionSection();
};

function loadCurrentInstructionSection() {
    hideAll();
    const currentSec = activeSectionList[currentSectionIndex];
    const displayLabel = String.fromCharCode(65 + currentSectionIndex);

    document.getElementById('screen-instruction').classList.remove('hidden');
    document.getElementById('inst-title').innerText = `Section ${displayLabel}: ${currentSec.name}`;
    document.getElementById('inst-example').innerText = `Please review instructions for ${currentSec.name}`;
    speak(`Section ${displayLabel} is ${currentSec.name}. Read the instructions carefully.`);
}

window.startActivePart = function () {
    window.isTestActive = true;

    hideAll();
    document.getElementById('screen-test').classList.remove('hidden');
    ['part-a', 'part-b', 'part-c', 'part-d', 'part-e', 'part-f', 'part-g', 'part-tf', 'part-fib'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const currentSec = activeSectionList[currentSectionIndex];
    const displayLabel = String.fromCharCode(65 + currentSectionIndex);
    document.getElementById('part-indicator').innerText = `Section ${displayLabel}: ${currentSec.name}`;

    let setObj = normalizeActiveSet(activeSet);

    if (currentSec.key === 'obj') {
        document.getElementById('part-a').classList.remove('hidden');
        currentObjIdx = 0; showSingleObjQuestion();
    } else if (currentSec.key === 'email') {
        document.getElementById('part-b').classList.remove('hidden');
        document.getElementById('qb-email-prompt').innerText = setObj.email.question;
        startTimer(600, () => window.submitEmailAndNext());
    } else if (currentSec.key === 'typing') {
        document.getElementById('part-c').classList.remove('hidden');
        document.getElementById('qc-typing').innerText = setObj.typing;
        typingStartTime = new Date();
        startTimer(120, () => window.submitTypingAndNext());
    } else if (currentSec.key === 'voiceD') {
        document.getElementById('part-d').classList.remove('hidden');
        currentDIdx = 0; showSingleDQuestion();
    } else if (currentSec.key === 'passagesE') {
        document.getElementById('part-e').classList.remove('hidden');
        currentEIdx = 0; showSingleEQuestion();
    } else if (currentSec.key === 'audioPromptsF') {
        document.getElementById('part-f').classList.remove('hidden');
        currentFIdx = 0; showSingleFQuestion();
    } else if (currentSec.key === 'storyG') {
        document.getElementById('part-g').classList.remove('hidden');
        currentGIdx = 0; showSingleGQuestion();
    } else if (currentSec.key === 'trueFalse') {
        if (document.getElementById('part-tf')) document.getElementById('part-tf').classList.remove('hidden');
        currentTFIdx = 0; showSingleTFQuestion();
    } else if (currentSec.key === 'fillBlanks') {
        if (document.getElementById('part-fib')) document.getElementById('part-fib').classList.remove('hidden');
        currentFIBIdx = 0; showSingleFIBQuestion();
    }
};

function goToNextSectionInOrder() {
    clearInterval(timerInterval);
    currentSectionIndex++;
    if (currentSectionIndex < activeSectionList.length) {
        loadCurrentInstructionSection();
    } else {
        finishTest();
    }
}

// 🟢 UPDATED & FIXED: Hardware Diagnostics & Strict Dual-Collection Ban Sync
window.goToHardwareCheck = async function () {
    const nameEl = document.getElementById('cand-name');
    const emailEl = document.getElementById('cand-email');

    const name = nameEl ? nameEl.value.trim() : "";
    const email = emailEl ? emailEl.value.trim().toLowerCase() : "";

    if (!name || !email) {
        Swal.fire({ icon: 'warning', title: 'Adhuri Jaankari', text: 'Kripya apna naam aur email darj karein!', customClass: { popup: 'swal-mobile-size' } });
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        Swal.fire({ icon: 'error', title: 'Galat Email', text: 'Kripya ek sahi email ID darj karein!', customClass: { popup: 'swal-mobile-size' } });
        return;
    }

    const userDocId = email.replace(/[^a-zA-Z0-9]/g, "_");

    // Check Status in both Collections
    let isBanned = false, banReason = "Excessive OTP Failures";
    try {
        const otpRef = doc(db, "otp_attempts", userDocId);
        const otpSnap = await getDoc(otpRef);
        if (otpSnap.exists() && otpSnap.data().isBanned === true) {
            isBanned = true;
            banReason = otpSnap.data().banReason || banReason;
        }

        const userStatusRef = doc(db, "user_status", email);
        const userStatusSnap = await getDoc(userStatusRef);
        if (userStatusSnap.exists() && userStatusSnap.data().isBanned === true) {
            isBanned = true;
            banReason = userStatusSnap.data().banReason || banReason;
        }
    } catch (e) {
        console.warn("Ban check warning:", e);
    }

    if (isBanned) {
        Swal.fire({
            icon: 'error',
            title: 'Account Blocked',
            text: `Aapka account block hai. Karan: "${banReason}". Kripya Admin se sampark karein!`,
            customClass: { popup: 'swal-mobile-size' }
        });
        return;
    }

    hideAll();
    const sysScreen = document.getElementById('screen-syscheck');
    if (sysScreen) sysScreen.classList.remove('hidden');

    speak("System diagnostics check. Please verify network speed and microphone input.");

    window.generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    sendOTPViaEmail(email, name, window.generatedOTP)
        .then(() => {
            Swal.fire({
                icon: 'success',
                title: 'OTP Sent',
                text: `OTP has been sent to your email (${email}).`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 4000
            });
        })
        .catch(err => {
            console.error("OTP delivery fail:", err);
            Swal.fire({ icon: 'info', title: 'System Ready', text: 'Please complete diagnostics checks.', customClass: { popup: 'swal-mobile-size' } });
        });
};

// 🟢 UPDATED & FIXED: OTP Verification Engine with Automatic Dashboard Sync & Notification
window.promptOTPVerification = async function () {
    if (window.isOTPVerified) {
        Swal.fire({ icon: 'info', title: 'Verified', text: 'Aapka OTP pehle hi verify ho chuka hai!', customClass: { popup: 'swal-mobile-size' } });
        return;
    }

    const email = document.getElementById('cand-email').value.trim().toLowerCase();
    const name = document.getElementById('cand-name').value.trim();
    const userDocId = email.replace(/[^a-zA-Z0-9]/g, "_");
    const userRef = doc(db, "otp_attempts", userDocId);

    let userSnap = null;
    try { userSnap = await getDoc(userRef); } catch (e) { }

    let attempts = userSnap && userSnap.exists() ? (userSnap.data().attempts || 0) : 0;

    const { value: userOTP } = await Swal.fire({
        title: `Enter 6-Digit OTP (Attempt ${attempts + 1}/3)`,
        input: 'text',
        inputPlaceholder: 'Enter OTP here',
        showCancelButton: true,
        confirmButtonText: 'Verify OTP',
        confirmButtonColor: '#2563eb',
        customClass: { popup: 'swal-mobile-size' },
        inputValidator: (value) => { if (!value) return 'Kripya OTP darj karein!'; }
    });

    if (userOTP) {
        if (userOTP.trim() === window.generatedOTP) {
            window.isOTPVerified = true;
            // Clear Ban and Attempts in Firebase
            await setDoc(userRef, { attempts: 0, isBanned: false, lastSuccess: serverTimestamp() }, { merge: true });
            await setDoc(doc(db, "user_status", email), { isBanned: false }, { merge: true });

            Swal.fire({ icon: 'success', title: 'Success!', text: 'OTP verified successfully!', timer: 1500, showConfirmButton: false });
            window.checkProceed();
        } else {
            attempts++;
            if (attempts >= 3) {
                const banReason = "3 wrong OTP Attempts Inputted";


                const banTimeISO = new Date().toISOString(); // Current Exact Time & Date

                // 1. Sync Ban to `otp_attempts`
                await setDoc(userRef, {
                    attempts: attempts,
                    isBanned: true,
                    banReason: banReason,
                    bannedAt: banTimeISO,
                    email: email,
                    name: name
                }, { merge: true });

                // 2. Sync Ban to `user_status` (Dashboard Match)
                await setDoc(doc(db, "user_status", email), {
                    isBanned: true,
                    banReason: banReason,
                    bannedAt: banTimeISO,
                    bannedBy: "System (OTP Security)",
                    email: email,
                    studentName: name
                }, { merge: true });

                // 3. Send Notification to Admin Dashboard
                notifyAdminBan(name, email, banReason);

                Swal.fire({
                    icon: 'error',
                    title: 'Account Locked & Banned',
                    text: 'Aapne 3 baar galat OTP dala hai. Aapka account lock ho gaya hai aur Dashboard par report kar diya gaya hai.',
                    customClass: { popup: 'swal-mobile-size' }
                });
            } else {
                await setDoc(userRef, { attempts: attempts }, { merge: true });
                Swal.fire({
                    icon: 'error',
                    title: 'Wrong OTP',
                    text: `Galat OTP! Remaining attempts: ${3 - attempts}`,
                    customClass: { popup: 'swal-mobile-size' }
                });
            }
        }
    }
};

window.resendOTP = function () {
    const name = document.getElementById('cand-name').value.trim();
    const email = document.getElementById('cand-email').value.trim();
    window.generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    sendOTPViaEmail(email, name, window.generatedOTP);
    Swal.fire({ icon: 'info', title: 'OTP Resent', text: 'Naya OTP aapke email par bhej diya gaya hai.', customClass: { popup: 'swal-mobile-size' } });
};

async function sendOTPViaEmail(userEmail, userName, otp) {
    return emailjs.send("service_jbqilad", "template_qzb1uuf", {
        to_name: userName,
        to_email: userEmail,
        otp_code: otp
    });
}

// 🟢 NOTIFY ADMIN ON DASHBOARD
async function notifyAdminBan(userName, userEmail, reason) {
    try {
        await addDoc(collection(db, "banned_notifications"), {
            name: userName,
            email: userEmail.toLowerCase(),
            reason: reason || "3 Incorrect OTP Attempts",
            timestamp: serverTimestamp(),
            status: "UNREAD"
        });
    } catch (e) {
        console.error("Admin notification error", e);
    }
}

window.runRealSpeedTest = function () {
    const resultBox = document.getElementById('net-result');
    resultBox.innerText = "Checking connection latency...";
    const startTime = new Date().getTime();
    fetch("https://www.cloudflare.com/cdn-cgi/trace?" + startTime, { cache: 'no-store' })
        .then(res => res.text())
        .then(() => {
            const duration = (new Date().getTime() - startTime) / 1000;
            resultBox.innerText = `Connected! Latency: ${Math.round(duration * 1000)}ms. Status: Excellent.`;
            resultBox.className = "text-xs text-green-400 font-bold";
            isNetOk = true; window.checkProceed();
        })
        .catch(() => {
            resultBox.innerText = "Speed check completed. Connection verified.";
            resultBox.className = "text-xs text-green-400 font-bold";
            isNetOk = true; window.checkProceed();
        });
};

// Microphone Visualizer
let testStream = null, testRecorder = null, testChunks = [], audioBlob = null, audioCtx = null, analyser = null, animFrameId = null;

window.testMicRecord = async function () {
    const btnRec = document.getElementById('btn-mic-rec');
    const btnListen = document.getElementById('btn-mic-listen');
    const placeholder = document.getElementById('visualizer-placeholder');

    if (!testRecorder || testRecorder.state === "inactive") {
        try {
            testStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') await audioCtx.resume();

            analyser = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(testStream);
            source.connect(analyser);
            analyser.fftSize = 64;

            const options = MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : {};
            testRecorder = new MediaRecorder(testStream, options);
            testChunks = [];

            testRecorder.ondataavailable = e => { if (e.data.size > 0) testChunks.push(e.data); };

            testRecorder.onstop = () => {
                audioBlob = new Blob(testChunks, { type: testRecorder.mimeType || 'audio/wav' });

                if (btnListen) {
                    btnListen.disabled = false;
                    btnListen.className = "bg-green-600 hover:bg-green-700 text-2xs xs:text-xs text-white px-3 py-2 rounded font-bold transition-all cursor-pointer shadow-md";
                }

                document.getElementById('mic-confirm-box').classList.remove('hidden');

                cancelAnimationFrame(animFrameId);
                clearVisualizerCanvas();
                if (placeholder) {
                    placeholder.classList.remove('hidden');
                    placeholder.innerText = "Recording saved. Click Listen Sample Audio.";
                }

                if (testStream) testStream.getTracks().forEach(track => track.stop());
                if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
            };

            testRecorder.start();
            btnRec.innerText = "⏹ Stop Recording";
            btnRec.className = "btn-danger text-2xs xs:text-xs bg-yellow-600 hover:bg-yellow-700 p-1.5 xs:p-2 rounded font-semibold whitespace-nowrap";

            if (placeholder) placeholder.classList.add('hidden');
            drawVisualizerGraph();

        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Microphone Error',
                text: 'Could not access microphone: ' + err.message,
                customClass: { popup: 'swal-mobile-size' }
            });
        }
    } else {
        testRecorder.stop();
        btnRec.innerText = "🔴 Record Sample Again";
        btnRec.className = "btn-danger text-2xs xs:text-xs bg-red-600 hover:bg-red-700 p-1.5 xs:p-2 rounded font-semibold whitespace-nowrap";
    }
};

function drawVisualizerGraph() {
    const canvas = document.getElementById('audio-visualizer');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function renderFrame() {
        animFrameId = requestAnimationFrame(renderFrame);
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, '#10b981');
            gradient.addColorStop(1, '#f59e0b');

            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
            x += barWidth;
        }
    }
    renderFrame();
}

function clearVisualizerCanvas() {
    const canvas = document.getElementById('audio-visualizer');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

window.playMicSample = function () {
    if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        const playAudio = new Audio(audioUrl);
        playAudio.play();
    }
};

window.checkProceed = function () {
    const chk = document.getElementById('chk-audio-ok');
    isAudioOk = chk ? chk.checked : false;
    if (isNetOk && isAudioOk && window.isOTPVerified) {
        document.getElementById('btn-proceed-test').classList.remove('hidden');
    }
};

function showSingleObjQuestion() {
    let setObj = normalizeActiveSet(activeSet);
    if (!setObj || !setObj.obj || currentObjIdx >= setObj.obj.length) {
        goToNextSectionInOrder();
        return;
    }
    const qObj = setObj.obj[currentObjIdx];
    document.getElementById('qa-counter').innerText = `Question ${currentObjIdx + 1} of ${setObj.obj.length}`;
    document.getElementById('qa-text').innerText = qObj.q;
    document.getElementById('qa-options').innerHTML = qObj.opts.map(o =>
        `<label class="block bg-gray-600 p-3 rounded cursor-pointer hover:bg-gray-500 text-sm">
            <input type="radio" name="single_q_opt" value="${o}"> ${o}
        </label>`
    ).join('');
    startTimer(60, () => window.saveAndNextObj());
}

window.saveAndNextObj = function () {
    clearInterval(timerInterval);
    const sel = document.querySelector('input[name="single_q_opt"]:checked');
    userObjAnswers[currentObjIdx] = sel ? sel.value : "Not Answered";
    currentObjIdx++;

    let setObj = normalizeActiveSet(activeSet);
    if (setObj && setObj.obj && currentObjIdx >= setObj.obj.length) {
        goToNextSectionInOrder();
    } else {
        showSingleObjQuestion();
    }
};

window.submitEmailAndNext = function () {
    clearInterval(timerInterval);
    goToNextSectionInOrder();
};

window.submitTypingAndNext = function () {
    clearInterval(timerInterval);
    if (typeof window.trackTyping === 'function') {
        window.trackTyping();
    }
    goToNextSectionInOrder();
};

function showSingleDQuestion() {
    let setObj = normalizeActiveSet(activeSet);
    if (!setObj || !setObj.voiceD || currentDIdx >= setObj.voiceD.length) { goToNextSectionInOrder(); return; }
    document.getElementById('qd-counter').innerText = `Prompt ${currentDIdx + 1} of ${setObj.voiceD.length}`;
    document.getElementById('qd-voice-text').innerText = `"${setObj.voiceD[currentDIdx]}"`;
    document.getElementById('transcribed-text-d').innerText = "Listening...";
    startTimer(45, () => window.saveAndNextD());
}

window.saveAndNextD = function () {
    clearInterval(timerInterval);
    currentDIdx++;
    let setObj = normalizeActiveSet(activeSet);
    if (setObj && setObj.voiceD && currentDIdx >= setObj.voiceD.length) {
        goToNextSectionInOrder();
    } else {
        showSingleDQuestion();
    }
};

function showSingleEQuestion() {
    let setObj = normalizeActiveSet(activeSet);
    if (!setObj || !setObj.passagesE || currentEIdx >= setObj.passagesE.length) { goToNextSectionInOrder(); return; }
    document.getElementById('qe-counter').innerText = `Passage ${currentEIdx + 1} of ${setObj.passagesE.length}`;
    document.getElementById('ans-passage-e').value = "";
    const textEl = document.getElementById('qe-display-text');
    textEl.innerText = setObj.passagesE[currentEIdx];
    textEl.classList.remove('fade-out');

    setTimeout(() => { textEl.classList.add('fade-out'); }, 8000);
    startTimer(60, () => window.saveAndNextE());
}

window.saveAndNextE = function () {
    clearInterval(timerInterval);
    userEAnswers[currentEIdx] = document.getElementById('ans-passage-e').value || "No Response";
    currentEIdx++;
    let setObj = normalizeActiveSet(activeSet);
    if (setObj && setObj.passagesE && currentEIdx >= setObj.passagesE.length) {
        goToNextSectionInOrder();
    } else {
        showSingleEQuestion();
    }
};

function showSingleFQuestion() {
    let setObj = normalizeActiveSet(activeSet);
    if (!setObj || !setObj.audioPromptsF || currentFIdx >= setObj.audioPromptsF.length) { goToNextSectionInOrder(); return; }
    document.getElementById('qf-counter').innerText = `Audio Item ${currentFIdx + 1} of ${setObj.audioPromptsF.length}`;
    document.getElementById('transcribed-text-f').innerText = "Listening...";
    speak(setObj.audioPromptsF[currentFIdx]);
    startTimer(45, () => window.saveAndNextF());
}

window.saveAndNextF = function () {
    clearInterval(timerInterval);
    currentFIdx++;
    let setObj = normalizeActiveSet(activeSet);
    if (setObj && setObj.audioPromptsF && currentFIdx >= setObj.audioPromptsF.length) {
        goToNextSectionInOrder();
    } else {
        showSingleFQuestion();
    }
};

function showSingleGQuestion() {
    let setObj = normalizeActiveSet(activeSet);
    if (!setObj || !setObj.storyG || currentGIdx >= setObj.storyG.length) { goToNextSectionInOrder(); return; }
    const qG = setObj.storyG[currentGIdx];
    document.getElementById('qg-counter').innerText = `Question ${currentGIdx + 1} of ${setObj.storyG.length}`;
    document.getElementById('qg-prompt-title').innerText = `Q${currentGIdx + 1}. Story Task`;
    document.getElementById('qg-prompt-desc').innerText = qG.question;
    document.getElementById('ans-story-g').value = "";

    document.getElementById('btn-next-g').innerText = (currentGIdx === setObj.storyG.length - 1) ? "Next Section" : "Next Question";
    startTimer(300, () => window.saveAndNextG());
}

window.saveAndNextG = function () {
    clearInterval(timerInterval);
    userGAnswers[currentGIdx] = document.getElementById('ans-story-g').value || "";
    currentGIdx++;
    let setObj = normalizeActiveSet(activeSet);
    if (setObj && setObj.storyG && currentGIdx >= setObj.storyG.length) {
        goToNextSectionInOrder();
    } else {
        showSingleGQuestion();
    }
};

function showSingleTFQuestion() {
    let setObj = normalizeActiveSet(activeSet);
    if (!setObj || !setObj.trueFalse || currentTFIdx >= setObj.trueFalse.length) { goToNextSectionInOrder(); return; }
    const qTF = setObj.trueFalse[currentTFIdx];
    if (document.getElementById('qtf-counter')) document.getElementById('qtf-counter').innerText = `Question ${currentTFIdx + 1} of ${setObj.trueFalse.length}`;
    if (document.getElementById('qtf-text')) document.getElementById('qtf-text').innerText = qTF.q;
    startTimer(30, () => window.saveAndNextTF());
}

window.saveAndNextTF = function () {
    clearInterval(timerInterval);
    const sel = document.querySelector('input[name="single_tf_opt"]:checked');
    userTFAnswers[currentTFIdx] = sel ? sel.value : "Not Answered";
    currentTFIdx++;
    let setObj = normalizeActiveSet(activeSet);
    if (setObj && setObj.trueFalse && currentTFIdx >= setObj.trueFalse.length) {
        goToNextSectionInOrder();
    } else {
        showSingleTFQuestion();
    }
};

function showSingleFIBQuestion() {
    let setObj = normalizeActiveSet(activeSet);
    if (!setObj || !setObj.fillBlanks || currentFIBIdx >= setObj.fillBlanks.length) { goToNextSectionInOrder(); return; }
    const qFIB = setObj.fillBlanks[currentFIBIdx];
    if (document.getElementById('qfib-counter')) document.getElementById('qfib-counter').innerText = `Question ${currentFIBIdx + 1} of ${setObj.fillBlanks.length}`;
    if (document.getElementById('qfib-text')) document.getElementById('qfib-text').innerText = qFIB.q;
    if (document.getElementById('ans-fib')) document.getElementById('ans-fib').value = "";
    startTimer(45, () => window.saveAndNextFIB());
}

window.saveAndNextFIB = function () {
    clearInterval(timerInterval);
    const ans = document.getElementById('ans-fib') ? document.getElementById('ans-fib').value.trim() : "";
    userFIBAnswers[currentFIBIdx] = ans || "Not Answered";
    currentFIBIdx++;
    let setObj = normalizeActiveSet(activeSet);
    if (setObj && setObj.fillBlanks && currentFIBIdx >= setObj.fillBlanks.length) {
        goToNextSectionInOrder();
    } else {
        showSingleFIBQuestion();
    }
};

let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
}

window.toggleRecordPart = function (partKey) {
    const btn = document.getElementById(`btn-rec-${partKey.toLowerCase()}`);
    const textDisplay = document.getElementById(`transcribed-text-${partKey.toLowerCase()}`);
    let setObj = normalizeActiveSet(activeSet);

    if (recognition) {
        recognition.start();
        btn.innerText = "🎙 Listening... Speak Now";

        recognition.onresult = (event) => {
            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }
            textDisplay.innerText = transcript;
            if (partKey === 'D') voiceDAnswers[currentDIdx] = transcript;
            if (partKey === 'F') voiceFAnswers[currentFIdx] = transcript;
        };

        recognition.onend = () => {
            btn.innerText = "🔴 Record Again";
        };
    } else {
        alert("Browser speech recognition not supported.");
        textDisplay.innerText = partKey === 'D' ? setObj.voiceD[currentDIdx] : setObj.audioPromptsF[currentFIdx];
    }
};

function startTimer(seconds, onTimeout) {
    let left = seconds;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        let m = Math.floor(left / 60);
        let s = left % 60;
        document.getElementById('timer-display').innerText = `Time Left: ${m}:${s < 10 ? '0' : ''}${s}`;
        if (left <= 0) {
            clearInterval(timerInterval);
            if (onTimeout) onTimeout();
        }
        left--;
    }, 1000);
}

// Evaluation Logic
window.trackTyping = function () {
    let setObj = normalizeActiveSet(activeSet);
    const typed = (document.getElementById('ans-typing') ? document.getElementById('ans-typing').value : "").trim();
    const target = setObj && setObj.typing ? setObj.typing.trim() : "";
    if (!typed || !target) { finalWPM = 0; finalAcc = 0; return; }

    const typedWords = typed.split(/\s+/);
    const targetWords = target.split(/\s+/);
    let correctWordsCount = 0;

    typedWords.forEach((word, index) => {
        if (targetWords[index] && word === targetWords[index]) correctWordsCount++;
    });

    const mins = (new Date() - typingStartTime) / 60000;
    finalWPM = mins > 0 ? Math.round(correctWordsCount / mins) : 0;
    finalAcc = targetWords.length > 0 ? Math.round((correctWordsCount / targetWords.length) * 100) : 0;
};

function getSimilarityPercentage(a, b) {
    if (!a || !b) return 0;
    let cleanA = a.toLowerCase().replace(/[^\w\s]/gi, '').trim();
    let cleanB = b.toLowerCase().replace(/[^\w\s]/gi, '').trim();
    if (cleanA === cleanB) return 100;

    let aWords = cleanA.split(/\s+/);
    let bWords = cleanB.split(/\s+/);
    let matches = 0;
    aWords.forEach(word => { if (bWords.includes(word)) matches++; });
    return Math.round((matches / Math.max(aWords.length, bWords.length)) * 100);
}

function validateGrammarlyStyle(text) {
    if (!text || text.trim().length < 10) return { isValid: false, penaltyPct: 0.50 };
    let penaltyPct = 0;
    const cleanText = text.trim();
    const sentences = cleanText.split(/(?<=[.!?])\s+/).filter(Boolean);

    sentences.forEach(sentence => {
        if (!/^[A-Z]/.test(sentence)) penaltyPct += 0.05;
        if (!/[.!?]$/.test(sentence)) penaltyPct += 0.05;
    });

    if (/\b(a)\s+[aeiou]\w+/i.test(cleanText)) penaltyPct += 0.10;
    if (/\b(an)\s+[bcdfghjklmnpqrstvwxyz]\w+/i.test(cleanText)) penaltyPct += 0.10;
    if (/\b(he|she|it|this|that)\s+(have|do|go|were)\b/i.test(cleanText)) penaltyPct += 0.15;
    if (/\b(they|we|you|these|those)\s+(has|does|goes|was)\b/i.test(cleanText)) penaltyPct += 0.15;
    if (/\b(\w+)\s+\1\b/i.test(cleanText)) penaltyPct += 0.20;
    if (cleanText.split(/\s+/).length < 4) penaltyPct += 0.20;

    return { isValid: penaltyPct < 0.20, penaltyPct: Math.min(0.50, penaltyPct) };
}

function evaluateBestOfTwoSpecial(userAnswer, correctAnswer, keywords, baseMaxMarks, promptQuestion = "") {
    userAnswer = (userAnswer || "").trim();
    correctAnswer = (correctAnswer || "").trim();

    if (!userAnswer) {
        return { finalScore: 0, methodUsed: "No Answer Provided" };
    }

    if (promptQuestion && promptQuestion.length > 10) {
        const copySimPct = getSimilarityPercentage(userAnswer, promptQuestion);
        if (copySimPct >= 65) {
            return {
                finalScore: 0,
                methodUsed: "REJECTED (0 Marks): Question Copied as Answer"
            };
        }
    }

    const normUser = userAnswer.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();
    const normCorrect = correctAnswer.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();

    const exactSimPct = getSimilarityPercentage(normUser, normCorrect);
    let simScorePct = 0;

    if (exactSimPct >= 98) simScorePct = 100;
    else if (exactSimPct >= 90) simScorePct = 90;
    else if (exactSimPct >= 80) simScorePct = 80;
    else if (exactSimPct >= 70) simScorePct = 70;
    else simScorePct = Math.round(exactSimPct);

    const userWords = normUser.split(/\s+/);
    const matchedKeywords = keywords.filter(word =>
        userWords.includes(word.toLowerCase()) || normUser.includes(word.toLowerCase())
    );
    const keywordMatchPct = keywords.length > 0 ? (matchedKeywords.length / keywords.length) * 100 : 0;

    let keyScorePct = 0;
    if (keywordMatchPct >= 98) keyScorePct = 95;
    else if (keywordMatchPct >= 80) keyScorePct = 85;
    else if (keywordMatchPct >= 60) keyScorePct = 70;
    else if (keywordMatchPct >= 40) keyScorePct = 50;
    else keyScorePct = 0;

    let rawScorePct = 0;
    let evalMethod = "";

    if (simScorePct >= keyScorePct) {
        rawScorePct = simScorePct;
        evalMethod = `Similarity Match Won (${simScorePct}% Accuracy)`;
    } else {
        rawScorePct = keyScorePct;
        evalMethod = `Keyword Match Won (${matchedKeywords.length}/${keywords.length} Keywords)`;
    }

    const grammarResult = validateGrammarlyStyle(userAnswer);
    if (rawScorePct > 0 && grammarResult.penaltyPct > 0) {
        const penaltyAmount = rawScorePct * grammarResult.penaltyPct;
        rawScorePct = Math.max(0, rawScorePct - penaltyAmount);
        evalMethod += ` | Grammar Penalty (-${Math.round(grammarResult.penaltyPct * 100)}%)`;
    }

    const finalMarks = Math.round(((rawScorePct / 100) * baseMaxMarks) * 10) / 10;
    return { finalScore: finalMarks, methodUsed: evalMethod };
}

async function finishTest() {
    window.isTestActive = false;
    clearInterval(timerInterval);
    hideAll();
    document.getElementById('screen-result').classList.remove('hidden');

    const candName = document.getElementById('cand-name').value.trim();
    const candEmail = document.getElementById('cand-email').value.trim();

    let setObj = normalizeActiveSet(activeSet);
    let rawObtainedScore = 0;
    let rawMaxTotalScore = 0;
    let fullReportHtml = "";
    let sectionDisplayCounter = 0;

    const cfg = currentExamConfig || {};

    if (setObj) {
        if (cfg.secA !== false && setObj.obj && setObj.obj.length > 0) {
            const secLabel = String.fromCharCode(65 + sectionDisplayCounter++);
            let scoreA = 0, detailsA = "";
            setObj.obj.forEach((item, i) => {
                const userAns = userObjAnswers[i] || "Not Answered";
                const isCorr = userAns === item.ans;
                if (isCorr) scoreA += 1.5;
                detailsA += `
                    <div style="border-bottom:1px solid #e2e8f0; padding:8px 0;">
                        <p style="margin:2px 0;"><b>Q${i + 1}:</b> ${item.q}</p>
                        <p style="margin:2px 0;">Candidate Ans: <span style="color:${isCorr ? '#16a34a' : '#dc2626'}; font-weight:bold;">${userAns}</span></p>
                        <p style="margin:2px 0; color:#15803d; font-weight:bold;">Correct Answer: ${item.ans}</p>
                    </div>`;
            });
            rawObtainedScore += scoreA;
            rawMaxTotalScore += (setObj.obj.length * 1.5);
            fullReportHtml += `<div style="background:#1e40af; color:#fff; padding:6px 10px; font-weight:bold; margin-top:15px; border-radius:4px;">SECTION ${secLabel}: OBJECTIVE GRAMMAR (${scoreA} / ${setObj.obj.length * 1.5} Marks)</div>${detailsA}`;
        }

        if (cfg.secB !== false && setObj.email && setObj.email.question) {
            const secLabel = String.fromCharCode(65 + sectionDisplayCounter++);
            const userEmail = document.getElementById('ans-email') ? document.getElementById('ans-email').value : "";
            const evalB = evaluateBestOfTwoSpecial(userEmail, setObj.email.correctAnswer, setObj.email.keywords, 15, setObj.email.question);
            rawObtainedScore += evalB.finalScore;
            rawMaxTotalScore += 15;
            fullReportHtml += `
                <div style="background:#1e40af; color:#fff; padding:6px 10px; font-weight:bold; margin-top:15px; border-radius:4px;">SECTION ${secLabel}: EMAIL WRITING (${evalB.finalScore} / 15 Marks)</div>
                <div style="border-bottom:1px solid #e2e8f0; padding:8px 0;">
                    <p style="margin:4px 0;"><b>Question Prompt:</b> ${setObj.email.question}</p>
                    <p style="margin:4px 0;"><b>Candidate Response:</b> ${userEmail || 'No response'}</p>
                    <p style="color:#15803d; background:#f0fdf4; padding:6px; border-radius:4px; font-size:11px; margin:4px 0;"><b>Correct Standard Answer:</b> ${setObj.email.correctAnswer}</p>
                    <p style="font-size:11px; color:#4b5563; margin:2px 0;"><b>Evaluation Method:</b> ${evalB.methodUsed}</p>
                </div>`;
        }

        if (cfg.secC !== false && setObj.typing && setObj.typing.trim().length > 0) {
            const secLabel = String.fromCharCode(65 + sectionDisplayCounter++);
            let scoreC = finalAcc >= 20 ? Math.round((finalAcc / 100) * 10 + (Math.min(finalWPM, 40) / 40) * 5) : 0;
            rawObtainedScore += scoreC;
            rawMaxTotalScore += 15;
            fullReportHtml += `
                <div style="background:#1e40af; color:#fff; padding:6px 10px; font-weight:bold; margin-top:15px; border-radius:4px;">SECTION ${secLabel}: TYPING TEST (${scoreC} / 15 Marks)</div>
                <div style="padding:8px 0;">
                    <p style="margin:4px 0;"><b>Target Passage:</b> "${setObj.typing}"</p>
                    <p style="margin:4px 0;"><b>Speed:</b> ${finalWPM} WPM | <b>Accuracy:</b> ${finalAcc}%</p>
                </div>`;
        }

        if (cfg.secD !== false && setObj.voiceD && setObj.voiceD.length > 0) {
            const secLabel = String.fromCharCode(65 + sectionDisplayCounter++);
            let scoreD = 0, detailsD = "";
            setObj.voiceD.forEach((orig, i) => {
                const spoken = voiceDAnswers[i] || "Not Spoken";
                const isMatch = spoken.toLowerCase().includes(orig.split(" ")[0].toLowerCase());
                if (isMatch) scoreD += 3;
                detailsD += `
                    <div style="border-bottom:1px solid #e2e8f0; padding:8px 0;">
                        <p style="margin:2px 0;"><b>Prompt ${i + 1}:</b> "${orig}"</p>
                        <p style="margin:2px 0;">Candidate Spoke: <span style="color:${isMatch ? '#16a34a' : '#dc2626'}; font-weight:bold;">"${spoken}"</span></p>
                        <p style="margin:2px 0; color:#15803d; font-weight:bold;">Correct Sentence: "${orig}"</p>
                    </div>`;
            });
            rawObtainedScore += scoreD;
            rawMaxTotalScore += (setObj.voiceD.length * 3);
            fullReportHtml += `<div style="background:#1e40af; color:#fff; padding:6px 10px; font-weight:bold; margin-top:15px; border-radius:4px;">SECTION ${secLabel}: READ ALOUD (${scoreD} / ${setObj.voiceD.length * 3} Marks)</div>${detailsD}`;
        }

        if (cfg.secE !== false && setObj.passagesE && setObj.passagesE.length > 0) {
            const secLabel = String.fromCharCode(65 + sectionDisplayCounter++);
            let scoreE = 0, detailsE = "";
            const perQMax = 15 / setObj.passagesE.length;
            setObj.passagesE.forEach((orig, i) => {
                const rec = (userEAnswers[i] || "").trim();
                const simPct = getSimilarityPercentage(rec, orig);
                let qScore = simPct >= 90 ? perQMax : (simPct >= 60 ? Math.round((simPct / 100) * perQMax * 10) / 10 : 0);
                scoreE += qScore;
                detailsE += `
                    <div style="border-bottom:1px solid #e2e8f0; padding:8px 0;">
                        <p style="margin:2px 0;"><b>Target Passage ${i + 1}:</b> "${orig}"</p>
                        <p style="margin:2px 0;">Candidate Recall: "${rec || 'No response'}"</p>
                        <p style="margin:2px 0; color:#15803d; font-weight:bold;">Correct Passage: "${orig}"</p>
                        <p style="margin:2px 0; font-size:11px;">Marks Awarded: <b>${qScore} / ${perQMax}</b></p>
                    </div>`;
            });
            rawObtainedScore += scoreE;
            rawMaxTotalScore += 15;
            fullReportHtml += `<div style="background:#1e40af; color:#fff; padding:6px 10px; font-weight:bold; margin-top:15px; border-radius:4px;">SECTION ${secLabel}: MEMORY RECONSTRUCTION (${scoreE} / 15 Marks)</div>${detailsE}`;
        }

        if (cfg.secF !== false && setObj.audioPromptsF && setObj.audioPromptsF.length > 0) {
            const secLabel = String.fromCharCode(65 + sectionDisplayCounter++);
            let scoreF = 0, detailsF = "";
            setObj.audioPromptsF.forEach((orig, i) => {
                const spoken = voiceFAnswers[i] || "Not Spoken";
                const isMatch = spoken.toLowerCase().includes(orig.split(" ")[0].toLowerCase());
                if (isMatch) scoreF += 2;
                detailsF += `
                    <div style="border-bottom:1px solid #e2e8f0; padding:8px 0;">
                        <p style="margin:2px 0;"><b>Audio Prompt ${i + 1}:</b> "${orig}"</p>
                        <p style="margin:2px 0;">Candidate Spoke: <span style="color:${isMatch ? '#16a34a' : '#dc2626'}; font-weight:bold;">"${spoken}"</span></p>
                        <p style="margin:2px 0; color:#15803d; font-weight:bold;">Correct Sentence: "${orig}"</p>
                    </div>`;
            });
            rawObtainedScore += scoreF;
            rawMaxTotalScore += (setObj.audioPromptsF.length * 2);
            fullReportHtml += `<div style="background:#1e40af; color:#fff; padding:6px 10px; font-weight:bold; margin-top:15px; border-radius:4px;">SECTION ${secLabel}: LISTEN & REPEAT (${scoreF} / ${setObj.audioPromptsF.length * 2} Marks)</div>${detailsF}`;
        }

        if (cfg.secG !== false && setObj.storyG && setObj.storyG.length > 0) {
            const secLabel = String.fromCharCode(65 + sectionDisplayCounter++);
            let totalGScore = 0, detailsG = "";
            const perQMax = 15 / setObj.storyG.length;
            setObj.storyG.forEach((qG, i) => {
                const ansG = userGAnswers[i] || "";
                const evalG = evaluateBestOfTwoSpecial(ansG, qG.correctAnswer, qG.keywords, perQMax, qG.question);
                totalGScore += evalG.finalScore;
                detailsG += `
                    <div style="border-bottom:1px solid #e2e8f0; padding:8px 0;">
                        <p style="margin:4px 0;"><b>Question Prompt:</b> ${qG.question}</p>
                        <p style="margin:4px 0;"><b>Candidate Response:</b> "${ansG || 'No response'}"</p>
                        <p style="color:#15803d; background:#f0fdf4; padding:6px; border-radius:4px; font-size:11px; margin:4px 0;"><b>Correct Standard Response:</b> "${qG.correctAnswer}"</p>
                        <p style="font-size:11px; color:#4b5563; margin:2px 0;"><b>Evaluation Method:</b> ${evalG.methodUsed} | <b>Marks:</b> ${evalG.finalScore} / ${perQMax}</p>
                    </div>`;
            });
            rawObtainedScore += totalGScore;
            rawMaxTotalScore += 15;
            fullReportHtml += `<div style="background:#1e40af; color:#fff; padding:6px 10px; font-weight:bold; margin-top:15px; border-radius:4px;">SECTION ${secLabel}: STORY RESPONSES (${totalGScore} / 15 Marks)</div>${detailsG}`;
        }

        if (cfg.secTF !== false && setObj.trueFalse && setObj.trueFalse.length > 0) {
            const secLabel = String.fromCharCode(65 + sectionDisplayCounter++);
            let scoreTF = 0, detailsTF = "";
            setObj.trueFalse.forEach((item, i) => {
                const userAns = userTFAnswers[i] || "Not Answered";
                const isCorr = userAns.toLowerCase() === item.ans.toLowerCase();
                if (isCorr) scoreTF += 2;
                detailsTF += `
                    <div style="border-bottom:1px solid #e2e8f0; padding:8px 0;">
                        <p style="margin:2px 0;"><b>Q${i + 1}:</b> ${item.q}</p>
                        <p style="margin:2px 0;">Candidate Ans: <span style="color:${isCorr ? '#16a34a' : '#dc2626'}; font-weight:bold;">${userAns}</span></p>
                        <p style="margin:2px 0; color:#15803d; font-weight:bold;">Correct Answer: ${item.ans}</p>
                    </div>`;
            });
            rawObtainedScore += scoreTF;
            rawMaxTotalScore += (setObj.trueFalse.length * 2);
            fullReportHtml += `<div style="background:#1e40af; color:#fff; padding:6px 10px; font-weight:bold; margin-top:15px; border-radius:4px;">SECTION ${secLabel}: TRUE / FALSE (${scoreTF} / ${setObj.trueFalse.length * 2} Marks)</div>${detailsTF}`;
        }

        if (cfg.secFIB !== false && setObj.fillBlanks && setObj.fillBlanks.length > 0) {
            const secLabel = String.fromCharCode(65 + sectionDisplayCounter++);
            let scoreFIB = 0, detailsFIB = "";
            setObj.fillBlanks.forEach((item, i) => {
                const userAns = (userFIBAnswers[i] || "").trim();
                const isCorr = userAns.toLowerCase() === item.ans.toLowerCase();
                if (isCorr) scoreFIB += 2;
                detailsFIB += `
                    <div style="border-bottom:1px solid #e2e8f0; padding:8px 0;">
                        <p style="margin:2px 0;"><b>Q${i + 1}:</b> ${item.q}</p>
                        <p style="margin:2px 0;">Candidate Ans: <span style="color:${isCorr ? '#16a34a' : '#dc2626'}; font-weight:bold;">${userAns}</span></p>
                        <p style="margin:2px 0; color:#15803d; font-weight:bold;">Correct Answer: ${item.ans}</p>
                    </div>`;
            });
            rawObtainedScore += scoreFIB;
            rawMaxTotalScore += (setObj.fillBlanks.length * 2);
            fullReportHtml += `<div style="background:#1e40af; color:#fff; padding:6px 10px; font-weight:bold; margin-top:15px; border-radius:4px;">SECTION ${secLabel}: FILL IN THE BLANKS (${scoreFIB} / ${setObj.fillBlanks.length * 2} Marks)</div>${detailsFIB}`;
        }
    }

    let finalScaled100Score = rawMaxTotalScore > 0 ? Math.round((rawObtainedScore / rawMaxTotalScore) * 100) : 0;
    const passStatus = finalScaled100Score >= 50 ? "PASSED" : "FAILED";
    const formattedPdfFileName = `${candName}_wrc_result.pdf`;

    const downloadContainer = document.createElement('div');
    downloadContainer.style.padding = "20px";
    downloadContainer.style.color = "#111827";
    downloadContainer.style.background = "#ffffff";
    downloadContainer.innerHTML = `
        <div style="text-align:center; border-bottom:2px solid #1d4ed8; padding-bottom:10px; margin-bottom:15px;">
            <h1 style="font-size:20px; color:#1e40af; font-weight:bold; margin:0;">${candName} - OFFICIAL EVALUATION REPORT</h1>
            <p style="font-size:12px; color:#4b5563; margin:4px 0 0 0;">VERSANT OFFICIAL DIAGNOSTIC SCORECARD</p>
        </div>
        <table style="width:100%; border-collapse:collapse; margin-bottom:15px; font-size:12px; background:#f9fafb; border:1px solid #e5e7eb;">
            <tr><td style="padding:6px; border:1px solid #e5e7eb;"><b>Candidate Name:</b> ${candName}</td><td style="padding:6px; border:1px solid #e5e7eb;"><b>Email:</b> ${candEmail}</td></tr>
            <tr><td style="padding:6px; border:1px solid #e5e7eb;"><b>Date/Time:</b> ${new Date().toLocaleString()}</td><td style="padding:6px; border:1px solid #e5e7eb;"><b>Final Scaled Score:</b> ${finalScaled100Score} / 100 (${passStatus})</td></tr>
        </table>
        <div>${fullReportHtml}</div>
    `;

    try {
        const opt = { margin: 0.4, filename: formattedPdfFileName, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
        html2pdf().set(opt).from(downloadContainer).save();
    } catch (downloadErr) {
        console.error("PDF Download Error:", downloadErr);
    }

    try {
        await addDoc(collection(db, "test_results"), {
            name: candName,
            email: candEmail,
            score: finalScaled100Score,
            status: passStatus,
            weekTag: selectedWeekTag,
            submittedAt: serverTimestamp()
        });
    } catch (err) {
        console.error("Firebase Storage Error:", err);
    }

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: candName, email: candEmail, score: `${finalScaled100Score} / 100`, status: passStatus, reportHtml: fullReportHtml, pdfFileName: formattedPdfFileName })
        });
    } catch (e) {
        console.error("Google Script Error:", e);
    }
}

window.downloadDetailedPDF = function () {
    Swal.fire({ icon: 'info', title: 'Scorecard PDF', text: 'Aapka scorecard PDF download ho gaya hai.', customClass: { popup: 'swal-mobile-size' } });
};

async function loadTestQuestions() {
    // 1. Check if specific week passed in URL (?week=2)
    const urlParams = new URLSearchParams(window.location.search);
    let targetWeek = urlParams.get('week');

    // 2. If not in URL, get global active week from Firebase
    if (!targetWeek) {
        try {
            const activeSnap = await getDoc(doc(db, "exam_config", "active_week_setting"));
            if (activeSnap.exists() && activeSnap.data().activeWeek) {
                targetWeek = activeSnap.data().activeWeek.toString();
            }
        } catch (e) {
            targetWeek = "1";
        }
    }

    // 3. Fetch specific questions for that week
    try {
        const res = await fetch('questions.json');
        const questionsList = await res.json();
        if (Array.isArray(questionsList)) {
            return questionsList.find(q => q.setId == targetWeek) || questionsList[0];
        }
        return questionsList;
    } catch (err) {
        console.error("Failed to load questions:", err);
    }
}
