const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// 🚨 Render.com 배포용 포트 10000번 강제 고정
const PORT = 10000;

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 데이터 저장 파일 경로
const DATA_FILE = path.join(__dirname, 'registrations.json');

// 초기 데이터 로드 함수
let registrations = [];
try {
    if (fs.existsSync(DATA_FILE)) {
        const fileData = fs.readFileSync(DATA_FILE, 'utf-8');
        registrations = JSON.parse(fileData);
        console.log("🟢 기존에 저장된 안전한 데이터를 성공적으로 불러왔습니다.");
    } else {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
        console.log("ℹ️ 새 데이터 저장 파일(registrations.json)을 생성했습니다.");
    }
} catch (error) {
    console.error("🔴 데이터 파일 로드 중 오류 발생:", error);
    registrations = [];
}

// 데이터 저장 함수
const saveData = () => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(registrations, null, 2));
    } catch (error) {
        console.error("🔴 데이터 저장 중 오류 발생:", error);
    }
};

// --- [API 라우트 설정] ---

// 1. 신청 현황 및 가용한 인원 조회
app.get('/api/status', (req, res) => {
    res.json(registrations);
});

// 2. 방과후 수강 신청 처리
app.post('/api/register', (req, res) => {
    const { studentId, studentName, className } = req.body;
    
    if (!studentId || !studentName || !className) {
        return res.status(400).json({ success: false, message: "모든 정보를 올바르게 입력해 주세요." });
    }

    // 중복 신청 방지 (예시: 동일 학번이 같은 강좌를 또 신청하는지 확인)
    const isDuplicate = registrations.some(r => r.studentId === studentId && r.className === className);
    if (isDuplicate) {
        return res.status(400).json({ success: false, message: "이미 신청 완료된 강좌입니다." });
    }

    const newRegistration = {
        studentId,
        studentName,
        className,
        timestamp: new Date().toISOString()
    };

    registrations.push(newRegistration);
    saveData();

    res.json({ success: true, message: "방과후 학교 수강 신청이 완료되었습니다!" });
});

// 3. 관리자용: 데이터 전체 초기화 (새 학기 버튼 기능)
app.post('/api/admin/reset', (req, res) => {
    registrations = [];
    saveData();
    console.log("🧹 관리자에 의해 모든 수강 신청 내역이 초기화되었습니다.");
    res.json({ success: true, message: "모든 신청 내역이 성공적으로 초기화되었습니다!" });
});

// 메인 페이지 라우팅 (경로 외 접근 시 index.html 제공)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🚀 Render 전용 서버 구동 (포트 10000번 바인딩)
app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`⚡ SKS Afterschool Server Running on Port ${PORT}`);
    console.log(`=============================================`);
});