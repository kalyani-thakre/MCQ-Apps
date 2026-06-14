// ⚠️ IMPORTANT: Yahan apna naya Deploy kiya hua Web App URL daaliye
const API_URL = "https://script.google.com/macros/s/AKfycbw55ZMLLmDYNGe-cOPm7nPXgiFDMF7G_NsBBisG2u5j0YkyzpCrAHFJ-yT-tc8cUOjO/exec"; 

let questions = [];
let current = 0;
let answers = {};
let skippedQuestions = [];
let time = 120;
let timerInterval;
let generatedOTP = null;

/* ================= 1. DIRECT EMAIL OTP ROUTE ================= */
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
function startQuiz(){
  document.getElementById("page1").style.display = "none";
  document.getElementById("page2").style.display = "block";
  document.getElementById("quiz").innerHTML = `<h2>Loading Question...</h2>`;

  let verifyBtn = document.getElementById("verifyOtpBtn");
  if(verifyBtn) {
    verifyBtn.innerText = "Verify OTP & Start Exam";
    verifyBtn.disabled = false;
    verifyBtn.style.opacity = "1";
  }

  fetch(API_URL)
    .then(response => response.json())
    .then(data => {
      questions = data.filter(q => q && q.question && String(q.question).trim() !== "");
      current = 0;
      renderQuestionNumbers();
      showQuestion();
      startTimer();
    })
    .catch(err => {
      console.error(err);
      alert("Error loading questions. Please check your Google Sheet.");
    });
}

/* ================= 4. TIMER ================= */
function startTimer(){
  clearInterval(timerInterval);
  timerInterval = setInterval(()=>{
    let min = Math.floor(time / 60);
    let sec = time % 60;
    document.getElementById("timer").innerHTML = `${min}:${sec < 10 ? "0"+sec : sec}`;
    if(time > 0){ 
      time--; 
    } else { 
      clearInterval(timerInterval); 
      submitQuiz(); 
    }
  },1000);
}

/* ================= 5. EXAM GRID & DISPLAY ================= */
function renderQuestionNumbers(){
  let html = "";
  questions.forEach((q,i)=>{
    html += `<div class="qnum" id="num${i}" onclick="goToQuestion(${i})">${i+1}</div>`;
  });
  document.getElementById("questionNumbers").innerHTML = html;
}

function updateQuestionColors(){
  questions.forEach((q,i)=>{
    let box = document.getElementById(`num${i}`);
    if(!box) return;
    box.classList.remove("current","answered","skipped");
    if(answers[i]){ box.classList.add("answered"); }
    else if(skippedQuestions.includes(i)){ box.classList.add("skipped"); }
    else if(i === current){ box.classList.add("current"); }
  });
}

function goToQuestion(index){ saveAnswer(); current = index; showQuestion(); }

function checkSubmitButtonVisibility() {
  let total = questions.length;
  let attempted = Object.keys(answers).length;
  
  if(attempted === total && total > 0){ 
    document.getElementById("submitBtn").style.display = "block"; 
  } else { 
    document.getElementById("submitBtn").style.display = "none"; 
  }
}

function showQuestion(){
  if(current >= questions.length){ submitQuiz(); return; }
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
    if(validOptions.length === 1 && (String(validOptions[0]).trim().toLowerCase() === "true" || String(validOptions[0]).trim().toLowerCase() === "false")) {
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

function saveAnswer(){
  if (questions.length === 0 || !questions[current]) return;
  let q = questions[current];
  let validOptions = [];
  if (q.options && Array.isArray(q.options)) {
    validOptions = q.options.filter(opt => opt && String(opt).trim() !== "" && String(opt).trim() !== "undefined" && String(opt).trim() !== "null");
  }
  
  if (validOptions.length === 0) {
    let typedVal = document.getElementById("typedAnswer") ? document.getElementById("typedAnswer").value.trim() : "";
    if(typedVal !== "") {
      answers[current] = typedVal;
      let box = document.getElementById(`num${current}`);
      if(box) box.classList.add("answered");
    } else {
      delete answers[current];
      let box = document.getElementById(`num${current}`);
      if(box) box.classList.remove("answered");
    }
  } else {
    let selected = document.querySelector('input[name="option"]:checked');
    if(selected){
      answers[current] = selected.value;
      let boxReal = document.getElementById(`num${current}`);
      if(boxReal) boxReal.classList.add("answered");
    }
  }
  checkSubmitButtonVisibility();
}

function previousQuestion(){ saveAnswer(); if(current > 0){ current--; showQuestion(); } }
function nextQuestion(){ saveAnswer(); if(current < questions.length - 1){ current++; showQuestion(); } }

window.skipQuestion = function() {
  if (!skippedQuestions.includes(current)) {
    skippedQuestions.push(current);
  }
  if(current < questions.length - 1){ 
    current++; 
    showQuestion(); 
  }
};

/* ================= 6. SUBMIT QUIZ ================= */
function submitQuiz(){
  if(questions.length === 0) return;
  clearInterval(timerInterval);
  
  if (document.getElementById("typedAnswer")) {
    saveAnswer();
  }
  
  let correctCount = 0; 
  let totalScore = 0;   
  let wrong = 0;
  let totalQuestions = questions.length; 
  
  for (let i = 0; i < totalQuestions; i++) {
    let q = questions[i];
    let studentAns = answers[i] ? String(answers[i]).trim().toLowerCase() : "";
    let correctAns = q.answer ? String(q.answer).trim().toLowerCase() : "";
    
    if (studentAns !== "") {
      if (studentAns === correctAns) {
        correctCount++;
        totalScore += q.marks ? Number(q.marks) : 1;
      } else {
        wrong++;
      }
    } else {
      wrong++; 
    }
  }
  
  let attempted = Object.keys(answers).length;
  let actualPercentage = (correctCount / totalQuestions) * 100;
  let finalPercentage = (actualPercentage * 0.70).toFixed(2);

  let statusText = "";
  let statusColor = "";

  if (attempted === 0) {
    statusText = "FAIL ❌";
    statusColor = "red";
    finalPercentage = "0.00"; 
  } else {
    statusText = parseFloat(finalPercentage) >= 35 ? "PASS " : "FAIL ";
    statusColor = parseFloat(finalPercentage) >= 35 ? "green" : "red";
  }

  // ================= DISCOUNT CALCULATION FOR SHEET & SCREEN =================
  let discountPercent = "0%";
  let pNum = parseFloat(finalPercentage);

  if (statusText.includes("FAIL") || attempted === 0) {
    discountPercent = "0%";
  } else {
    if (pNum >= 90 && pNum <= 100) {
      discountPercent = "30%";
    } else if (pNum >= 80 && pNum < 90) {
      discountPercent = "25%";
    } else if (pNum >= 50 && pNum < 80) {
      discountPercent = "20%";
    } else if (pNum >= 35 && pNum < 50) {
      discountPercent = "10%";
    }
  }

  let studentName = document.getElementById("name").value;
  let studentEmail = document.getElementById("email").value;
  let studentMobile = document.getElementById("mobile").value;

  // ✨ DO NO DATA KO ALAG ALAG BHEJ RAHE HAIN EXCEL MEIN SAVE KARNE KE LIYE
  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      name: studentName,
      email: studentEmail,
      mobile: studentMobile,
      score: totalScore,
      correct: correctCount,
      wrong: wrong,
      attempted: attempted,
      percentage: finalPercentage + "%",  // Column H me original marks % jayenge
      discount: discountPercent,          // Column I me discount % jayega
      status: statusText 
    })
  }).catch(e => console.log("Sheet saving bypassed or offline:", e));

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
  resultHtml += "<p><b>Raw Score :</b> " + totalScore + "</p>";
  resultHtml += "<hr style='border: 0.5px dashed #ccc; margin: 20px auto; width: 80%;'>";
  
  // Student ko screen par sirf unka Final Discount hi dikhega bina kisi confusion ke
  resultHtml += "<p style='font-size: 24px; margin-top: 15px;'><b>Final Discount :</b><br><b style='color: #083b91; font-size: 44px;'>" + discountPercent + "</b></p>";
  
  resultHtml += "<p style='font-size: 22px; margin-top: 15px;'><b>Result Status :</b><br><b style='color: " + statusColor + "; font-size: 30px;'>" + statusText + "</b></p>";
  resultHtml += "</div></div>";

  document.getElementById("result").innerHTML = resultHtml;
}