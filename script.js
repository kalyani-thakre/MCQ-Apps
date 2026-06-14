// ⚠️ IMPORTANT: Aapka Google Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbxpo90Mp4nVXPRltTPmSp-U5MZUvvJOr_702TWppKyI0J5n4JH93otBw0ZsVE-j_TY/exec";

let questions = [];
let current = 0;
let answers = {};
let skippedQuestions = [];

let examKaPakkaTime = 1800;
let timerInterval;
let generatedOTP = null;

/* ================= 1. DIRECT EMAIL OTP LOGIC ================= */
function sendOTP() {
    let name = document.getElementById("name").value.trim();
    let email = document.getElementById("email").value.trim();
    let mobile = document.getElementById("mobile").value.trim();
    let emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || !emailPattern.test(email) || mobile.length !== 10) {
        alert("Please enter valid Name, Email and 10-digit Mobile Number.");
        return;
    }

    generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();

    document.getElementById("sendOtpBtn").innerText = "Sending OTP...";
    document.getElementById("sendOtpBtn").disabled = true;
    document.getElementById("sendOtpBtn").style.opacity = "0.8";

    const scriptId = "otpScriptTag";
    const oldScript = document.getElementById(scriptId);
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `${API_URL}?email=${email}&otp=${generatedOTP}&name=${encodeURIComponent(name)}&callback=handleOtpResponse`;

    window.otpTimeout = setTimeout(() => {
        alert("❌ OTP Sending Failed! Please check your Google Script Authorization or URL.");
        resetOTPButton();
    }, 8000);

    document.body.appendChild(script);
}

window.handleOtpResponse = function(response) {
    clearTimeout(window.otpTimeout);
    if (response && response.status === "SUCCESS") {
        document.getElementById("otpContainer").style.display = "block";
        document.getElementById("verifyOtpBtn").style.display = "block";
        document.getElementById("sendOtpBtn").style.display = "none";
    } else {
        alert("❌ OTP Sending Failed: " + (response.message || "Unknown Error"));
        resetOTPButton();
    }
};

function resetOTPButton() {
    document.getElementById("sendOtpBtn").innerText = "Send OTP to Email";
    document.getElementById("sendOtpBtn").disabled = false;
    document.getElementById("sendOtpBtn").style.opacity = "1";
    document.getElementById("otpContainer").style.display = "none";
    document.getElementById("verifyOtpBtn").style.display = "none";
}

/* ================= 2. VERIFY OTP FUNCTION ================= */
function verifyOTP() {
    let userOTP = document.getElementById("otpInput").value.trim();
    let verifyBtn = document.getElementById("verifyOtpBtn");

    if (userOTP === "") {
        alert("Please enter the OTP");
        return;
    }

    if (userOTP === generatedOTP) {
        verifyBtn.innerText = "Verifying...";
        verifyBtn.disabled = true;
        verifyBtn.style.opacity = "0.8";

        setTimeout(() => {
            startQuiz();
        }, 1000);
    } else {
        alert("❌ Invalid OTP! Please enter correct OTP.");
    }
}

function startQuiz() {
  var courseId = document.getElementById("courseSelect").value;
  document.getElementById("page1").style.display = "none";
  document.getElementById("page2").style.display = "block";
  document.getElementById("quiz").innerHTML = "loading...";

  fetch(API_URL + "?course=" + courseId)
  .then(response => response.json())
  .then(data => {

      questions = data.questions || [];

      examKaPakkaTime = data.duration || 1800;

      if (questions.length > 0) {
        current = 0;
        renderQuestionNumbers();
        showQuestion();
        startTimer();
      } else {
        document.getElementById("quiz").innerHTML =
        "Is course ke liye questions nahi mile.";
      }
  })
}
window.handleQuestionsResponse = function(data) {
    questions = data.filter(q => q && q.question && String(q.question).trim() !== "");
    current = 0;
    if (questions.length > 0) {
        renderQuestionNumbers();
        showQuestion();
        startTimer();
    } else {
        alert("Google Sheet me koi question nahi mila!");
    }
};

function startTimer() {
    clearInterval(timerInterval);

    updateTimerDisplay();

    timerInterval = setInterval(() => {
        if (examKaPakkaTime <= 0) {
            clearInterval(timerInterval);
            submitQuiz();
            return;
        }

        examKaPakkaTime--;
        updateTimerDisplay();

    }, 1000);
}

function updateTimerDisplay() {
    let min = Math.floor(examKaPakkaTime / 60);
    let sec = examKaPakkaTime % 60;
    let timerElement = document.getElementById("timer");
    if (timerElement) {
        timerElement.innerHTML = `${min < 10 ? "0"+min : min}:${sec < 10 ? "0"+sec : sec}`;
    }
}

/* ================= 5. EXAM GRID & DISPLAY ================= */
function renderQuestionNumbers() {
    let html = "";
    questions.forEach((q, i) => {
        html += `<div class="qnum" id="num${i}" onclick="goToQuestion(${i})">${i+1}</div>`;
    });
    document.getElementById("questionNumbers").innerHTML = html;
}

function updateQuestionColors() {
    questions.forEach((q, i) => {
        let box = document.getElementById(`num${i}`);
        if (!box) return;

        box.classList.remove("current", "answered", "skipped");

        if (i === current) {
            box.classList.add("current");
        } else if (answers[i] !== undefined && answers[i] !== null && answers[i] !== "") {
            box.classList.add("answered");
        } else if (skippedQuestions.includes(i)) {
            box.classList.add("skipped");
        }
    });
}

function goToQuestion(index) {
    saveAnswer();
    current = index;
    showQuestion();
}

function checkSubmitButtonVisibility() {
    let submitBtn = document.getElementById("submitBtn");
    if (!submitBtn || questions.length === 0) return;

    let totalAnswered = Object.keys(answers).length;

    if (totalAnswered === questions.length) {
        submitBtn.style.setProperty('display', 'block', 'important');
    } else {
        submitBtn.style.setProperty('display', 'none', 'important');
    }
}

function showQuestion() {
    if (questions.length === 0) return;
    if (current >= questions.length) { current = questions.length - 1; }

    updateQuestionColors();
    let q = questions[current];
    document.getElementById("qcount").innerHTML = `Question ${current+1} / ${questions.length}`;
    let html = `<div class="question">${q.question}</div>`;

    let validOptions = [];
    if (q.options && Array.isArray(q.options)) {
        validOptions = q.options.filter(opt => opt && String(opt).trim() !== "" && String(opt).trim() !== "undefined" && String(opt).trim() !== "null");
    }

    if (validOptions.length === 0) {
        let savedText = answers[current] ? answers[current] : "";
        html += `<div class="type-container" style="margin-top:15px;">
                    <input type="text" id="typedAnswer" class="option" style="width:100%; padding:12px; font-size:16px; border:1px solid #ccc; border-radius:4px;" placeholder="Type your answer here..." value="${savedText}" oninput="saveAnswer()">
                 </div>`;
    } else {
        validOptions.forEach(opt => {
            let checked = answers[current] == opt ? "checked" : "";
            html += `<label class="option"><input type="radio" name="option" value="${opt}" ${checked} onchange="saveAnswer()"> ${opt}</label>`;
        });
    }

    document.getElementById("quiz").innerHTML = html;
    checkSubmitButtonVisibility();
}

function saveAnswer() {
    if (questions.length === 0 || !questions[current]) return;
    let q = questions[current];
    let validOptions = [];
    if (q.options && Array.isArray(q.options)) {
        validOptions = q.options.filter(opt => opt && String(opt).trim() !== "" && String(opt).trim() !== "undefined" && String(opt).trim() !== "null");
    }

    if (validOptions.length === 0) {
        let typedVal = document.getElementById("typedAnswer") ? document.getElementById("typedAnswer").value.trim() : "";
        if (typedVal !== "") {
            answers[current] = typedVal;
            let box = document.getElementById(`num${current}`);
            if (box) box.classList.add("answered");
        } else {
            delete answers[current];
            let box = document.getElementById(`num${current}`);
            if (box) box.classList.remove("answered");
        }
    } else {
        let selected = document.querySelector('input[name="option"]:checked');
        if (selected) {
            answers[current] = selected.value;
            let boxReal = document.getElementById(`num${current}`);
            if (boxReal) boxReal.classList.add("answered");
        }
    }
    checkSubmitButtonVisibility();
}

function previousQuestion() {
    saveAnswer();
    if (current > 0) { current--; showQuestion(); }
}

function nextQuestion() {
    saveAnswer();
    if (current < questions.length - 1) {
        current++;
        showQuestion();
    } else {
        checkSubmitButtonVisibility();
    }
}

window.skipQuestion = function() {
    delete answers[current];
    if (!skippedQuestions.includes(current)) {
        skippedQuestions.push(current);
    }
    if (current < questions.length - 1) {
        current++;
        showQuestion();
    } else {
        checkSubmitButtonVisibility();
    }
    updateQuestionColors();
};

/* ================= 6. SUBMIT QUIZ ================= */
function submitQuiz() {
    if (questions.length === 0) return;
    clearInterval(timerInterval);

    if (document.getElementById("typedAnswer")) {
        saveAnswer();
    }

    let totalScoreEarned = 0;
    let maxPossibleMarks = 0;
    let correctCount = 0;
    let wrong = 0;
    let totalQuestions = questions.length;

    for (let i = 0; i < totalQuestions; i++) {
        let q = questions[i];
        let questionWeight = q.marks ? Number(q.marks) : 1;
        maxPossibleMarks += questionWeight;

        let studentAns = answers[i] ? String(answers[i]).trim().toLowerCase() : "";
        let correctAns = q.answer ? String(q.answer).trim().toLowerCase() : "";

        if (studentAns !== "") {
            if (studentAns === correctAns) {
                correctCount++;
                totalScoreEarned += questionWeight;
            } else {
                wrong++;
            }
        } else {
            wrong++;
        }
    }

    let attempted = Object.keys(answers).length;
    let actualPercentage = maxPossibleMarks > 0 ? (totalScoreEarned / maxPossibleMarks) * 100 : 0;

    let statusText = (actualPercentage >= 50) ? "PASS ✅" : "FAIL ❌";
    let statusColor = (actualPercentage >= 50) ? "green" : "red";
    let industrialDiscount = Math.round((correctCount / totalQuestions) * 5000);
    let certificateDiscount = Math.round((correctCount / totalQuestions) * 2500);
    let foundationDiscount = Math.round((correctCount / totalQuestions) * 750);
    let customMessage = (actualPercentage >= 50) ? "🎉 Congratulations! You have unlocked your scholarship discount." : "✨ Hard Luck! Please try again to clear the exam.";

    let studentName = document.getElementById("name").value;
    let studentEmail = document.getElementById("email").value;
    let studentMobile = document.getElementById("mobile").value;

    const saveResultScript = document.createElement('script');
    const params = new URLSearchParams({
        action: "saveResult",
        name: studentName,
        email: studentEmail,
        mobile: studentMobile,
        score: totalScoreEarned,
        correct: correctCount,
        wrong: wrong,
        attempted: attempted,
        percentage: actualPercentage.toFixed(2) + "%",
        discount: "",
        status: statusText,
        callback: "handleSaveResponse"
    });

    saveResultScript.src = `${API_URL}?${params.toString()}`;
    document.body.appendChild(saveResultScript);

    window.handleSaveResponse = function(response) {
        console.log("Data successfully received in sheet:", response);
    };

    document.getElementById("page2").style.display = "none";
    document.getElementById("page3").style.display = "block";

    document.getElementById("result").innerHTML = `
<div class="result-card">

  <h2 class="result-title">Exam Result</h2>

  <p style="font-size:18px; font-weight:bold;">
    Name: ${studentName}
  </p>

  <div class="result-simple">

    <p><b>Attempted:</b> ${attempted}</p>
    <p><b>Correct:</b> ${correctCount}</p>
    <p><b>Wrong:</b> ${wrong}</p>
    <p><b>Total Score:</b> ${totalScoreEarned}</p>

  </div>

  <div class="course-container">

  <div class="course-box">
    <div class="course-name">Industrial Course</div>
   <div class="course-price">₹${industrialDiscount}</div>
  </div>

  <div class="course-box">
    <div class="course-name">Certificate Course</div>
   <div class="course-price">₹${certificateDiscount}</div>
  </div>

  <div class="course-box">
    <div class="course-name">Foundation Course</div>
    <div class="course-price">₹${foundationDiscount}</div>
  </div>

</div>

  <div class="status-box">
    <div class="status-title">Result Status</div>
    <div class="status-value" style="color:${statusColor}">
      ${statusText}
    </div>
  </div>

  <div class="message-box">
    ${customMessage}
  </div>

  <div class="certificate-card">
  <div class="certificate-row">

    <div class="certificate-left">

      <img src="logo.png" style="width: 350px; margin-bottom:25px;">

      <h1 style="text-align:left;">CERTIFICATE OF COMPLETION</h1>

      <p style="text-align:left;">This certificate is awarded to</p>

      <h2 class="student-name" style="text-align:left;">${studentName}</h2>

      <p style="text-align:left;">Who has successfully completed</p>

      <h3 class="course-name-cert" style="text-align:left;">
      ${document.getElementById("courseSelect").options[document.getElementById("courseSelect").selectedIndex].text}
      </h3>

      <p style="text-align:left;">
      Fullfilling All the requirements stipulated by Asterisc to achieve professional excellence.
      </p>

      <p style="text-align:left;">
      Issued Date: ${new Date().toLocaleDateString()}
      </p>

    </div>

    <div class="certificate-right">
     <img src="seal.png" class="seal-img">
      <img src="director-panel.png" class="director-img">
    </div>

  </div>
</div>
`;
}
