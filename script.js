// ⚠️ IMPORTANT: Aapka Google Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbzvt9rbtjhYq8BWnpU0Wrhs6TJ36LnUIY90hitWX7SR50-6WgSjH3goLcz6wYJ8rTo/exec"; 

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

/* ================= 3. START QUIZ ================= */
function startQuiz() {
  document.getElementById("page1").style.display = "none";
  document.getElementById("page2").style.display = "block";
  document.getElementById("quiz").innerHTML = `<h2>Loading Question...</h2>`;

  let verifyBtn = document.getElementById("verifyOtpBtn");
  if(verifyBtn) {
    verifyBtn.innerText = "Verify OTP & Start Exam";
    verifyBtn.disabled = false;
    verifyBtn.style.opacity = "1";
  }

  const scriptId = "questionsScriptTag";
  const oldScript = document.getElementById(scriptId);
  if (oldScript) oldScript.remove();

  const script = document.createElement('script');
  script.id = scriptId;
  script.src = `${API_URL}?callback=handleQuestionsResponse`;
  document.body.appendChild(script);
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

/* ================= 4. TIMER LOGIC ================= */
function startTimer() {
  clearInterval(timerInterval);
  examKaPakkaTime = 1800; 
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
    if (answers[i]) { box.classList.add("answered"); }
    else if (skippedQuestions.includes(i)) { box.classList.add("skipped"); }
    if (i === current) { box.classList.add("current"); }
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
    if (validOptions.length === 1 && (String(validOptions[0]).trim().toLowerCase() === "true" || String(validOptions[0]).trim().toLowerCase() === "false")) {
      validOptions = ["True", "False"];
    }

    validOptions.forEach(opt => {
      let checked = answers[current] === opt ? "checked" : "";
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
  if (!skippedQuestions.includes(current)) {
    skippedQuestions.push(current);
  }
  if (current < questions.length - 1) { 
    current++; 
    showQuestion(); 
  } else {
    checkSubmitButtonVisibility();
  }
};

/* ================= 6. SUBMIT QUIZ ================= */
function submitQuiz() {
  if (questions.length === 0) return;
  clearInterval(timerInterval);
  
  if (document.getElementById("typedAnswer")) {
    saveAnswer();
  }
  
  let correctCount = 0; 
  let wrong = 0;
  let totalQuestions = questions.length; 
  
  for (let i = 0; i < totalQuestions; i++) {
    let q = questions[i];
    let studentAns = answers[i] ? String(answers[i]).trim().toLowerCase() : "";
    let correctAns = q.answer ? String(q.answer).trim().toLowerCase() : "";
    
    if (studentAns !== "") {
      if (studentAns === correctAns) {
        correctCount++; // Har sahi question par exact 1 point badhega
      } else {
        wrong++;
      }
    } else {
      wrong++; 
    }
  }
  
  let attempted = Object.keys(answers).length;
  
  // GSheet ke liye percentage background me chalega
  let actualPercentage = (correctCount / totalQuestions) * 100;
  let finalPercentage = actualPercentage.toFixed(2);

  let statusText = "";
  let statusColor = "";

  if (correctCount >= 15 && attempted > 0) {
    statusText = "PASS ✅";
    statusColor = "green";
  } else {
    statusText = "FAIL ❌";
    statusColor = "red";
  }

  let discountPercent = "0%";
  if (correctCount === totalQuestions) {
    discountPercent = "30%"; 
  } else if (correctCount >= 25 && correctCount < totalQuestions) {
    discountPercent = "20%"; 
  } else if (correctCount >= 15 && correctCount < 25) {
    discountPercent = "10%"; 
  } else {
    discountPercent = "0%";  
  }

  let studentName = document.getElementById("name").value;
  let studentEmail = document.getElementById("email").value;
  let studentMobile = document.getElementById("mobile").value;

  const saveResultScript = document.createElement('script');
  const params = new URLSearchParams({
    action: "saveResult",
    name: studentName,
    email: studentEmail,
    mobile: studentMobile,
    score: correctCount, // 🔥 GSheet me bhi exact count (19 ya 30) hi score ban kar jayega
    correct: correctCount,
    wrong: wrong,
    attempted: attempted,
    percentage: finalPercentage + "%", 
    discount: discountPercent,
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
  
  let resultHtml = "";
  resultHtml += "<div style='text-align: center; max-width: 450px; margin: 0 auto; padding: 25px; font-family: sans-serif; background: #ffffff; border-radius: 12px;'>";
  resultHtml += "<h2 style='color: #083b91; font-size: 28px; margin-top: 0;'>Exam Result</h2>";
  resultHtml += "<hr style='border: 1px solid #083b91; margin-bottom: 25px; width: 40%;'>";
  resultHtml += "<div style='font-size: 18px; line-height: 1.8; color: #333;'>";
  resultHtml += "<p><b>Name :</b> " + studentName + "</p>";
  resultHtml += "<p><b>Attempted :</b> " + attempted + " / " + totalQuestions + "</p>";
  resultHtml += "<p><b>Correct Answers :</b> " + correctCount + "</p>";
  resultHtml += "<p><b>Wrong Answers :</b> " + wrong + "</p>";
  // 🎯 Yahan par sahi sawalon ki sankhya hi bache ka score ban kar dikhegi (30 me se 30 aane par 30 dikhega)
  resultHtml += "<p><b>Total Score :</b> " + correctCount + "</p>";
  resultHtml += "<hr style='border: 0.5px dashed #ccc; margin: 20px auto; width: 80%;'>";
  resultHtml += "<p style='font-size: 24px; margin-top: 15px;'><b>Final Discount :</b><br><b style='color: #083b91; font-size: 44px;'>" + discountPercent + "</b></p>";
  resultHtml += "<p style='font-size: 22px; margin-top: 15px;'><b>Result Status :</b><br><b style='color: " + statusColor + "; font-size: 30px;'>" + statusText + "</b></p>";
  resultHtml += "</div></div>";

  document.getElementById("result").innerHTML = resultHtml;
}
