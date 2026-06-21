const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// 데이터베이스 역할을 할 파일 경로 지정
const DATA_FILE = path.join(__dirname, 'data.json');

// 시스템 초기 기본 데이터 값 구조
let SYSTEM_DATA = {
    CLASSES: [
        { id: 1, name: "축구 교실", day: "월", startTime: "14:00", endTime: "15:30", limit: 2 },
        { id: 2, name: "로봇 과학", day: "월", startTime: "15:00", endTime: "16:30", limit: 15 }, 
        { id: 3, name: "창의 미술", day: "화", startTime: "14:00", endTime: "15:30", limit: 15 },
        { id: 4, name: "코딩 기초", day: "월", startTime: "16:00", endTime: "17:30", limit: 20 }
    ],
    PAGE_TITLES: {
        mainTitle: "소주한국학교 유초등부 및 유치원",
        subTitle: "26-2학기 방과후 수업 신청"
    },
    REGISTRATION_CONFIG: {
        startTime: "2026-06-19T00:00:00+09:00",
        endTime: "2026-09-13T23:59:59+09:00"
    },
    studentRegistrations: {}
};

// [함수] 현재 메모리 데이터를 파일(data.json)에 안전하게 저장
function saveToFile() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(SYSTEM_DATA, null, 2), 'utf8');
        console.log("💾 데이터가 파일에 성공적으로 영구 저장되었습니다.");
    } catch (err) {
        console.error("❌ 파일 저장 중 오류 발생:", err);
    }
}

// [함수] 서버가 켜질 때 기존 저장된 파일이 있다면 데이터를 불러옴
function loadFromFile() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
            SYSTEM_DATA = JSON.parse(fileContent);
            console.log("📂 기존에 저장된 안전한 데이터를 성공적으로 불러왔습니다.");
        } else {
            console.log("ℹ️ 기존 저장 파일이 없어 기본 데이터로 시작합니다.");
            saveToFile();
        }
    } catch (err) {
        console.error("❌ 파일 로드 중 오류 발생:", err);
    }
}

// 서버 시작 시 기존 데이터 불러오기 실행
loadFromFile();

// 1. 공용: 강좌 목록, 타이틀 문구, 서버시간 통합 조회
app.get('/api/classes', (req, res) => {
    const classesWithCount = SYSTEM_DATA.CLASSES.map(cls => {
        let count = 0;
        Object.values(SYSTEM_DATA.studentRegistrations).forEach(student => {
            if (student.classes && student.classes.includes(cls.id)) count++;
        });
        return { ...cls, currentCount: count };
    });
    res.json({ 
        classes: classesWithCount, 
        serverTime: new Date(), 
        config: {
            startTime: new Date(SYSTEM_DATA.REGISTRATION_CONFIG.startTime),
            endTime: new Date(SYSTEM_DATA.REGISTRATION_CONFIG.endTime)
        },
        titles: SYSTEM_DATA.PAGE_TITLES
    });
});

// 2. 관리자: 설정, 강좌, 제목 문구 일괄 수정 API
app.post('/api/admin/update', (req, res) => {
    const { startTime, endTime, classes, mainTitle, subTitle } = req.body;
    
    if (startTime) SYSTEM_DATA.REGISTRATION_CONFIG.startTime = startTime;
    if (endTime) SYSTEM_DATA.REGISTRATION_CONFIG.endTime = endTime;
    if (mainTitle) SYSTEM_DATA.PAGE_TITLES.mainTitle = mainTitle;
    if (subTitle) SYSTEM_DATA.PAGE_TITLES.subTitle = subTitle;
    
    if (classes) {
        SYSTEM_DATA.CLASSES = classes.map((c, idx) => ({
            id: idx + 1, name: c.name, day: c.day, startTime: c.startTime, endTime: c.endTime, limit: parseInt(c.limit) || 0
        }));
    }
    
    saveToFile();
    res.json({ success: true, message: "메인 제목 및 시스템 설정이 디스크에 안전하게 저장되었습니다." });
});

// 3. 관리자: 학생 명단 엑셀(CSV) 일괄 업로드
app.post('/api/admin/upload-students', (req, res) => {
    const { students } = req.body;
    if (!students || !Array.isArray(students)) return res.status(400).json({ success: false, message: "올바르지 않은 데이터 형식입니다." });
    
    let uploadCount = 0;
    students.forEach(s => {
        if (!s.grade || !s.name || !s.password) return;
        const userKey = `${s.grade.trim()}_${s.name.trim()}`;
        if (!SYSTEM_DATA.studentRegistrations[userKey]) {
            SYSTEM_DATA.studentRegistrations[userKey] = { grade: s.grade.trim(), name: s.name.trim(), password: String(s.password).trim(), classes: [] };
        } else {
            SYSTEM_DATA.studentRegistrations[userKey].password = String(s.password).trim();
        }
        uploadCount++;
    });
    
    saveToFile();
    res.json({ success: true, message: `총 ${uploadCount}명의 학생 비밀번호 정보가 디스크에 동기화되었습니다.` });
});

// 4. 관리자: 현재 전체 학생 신청 현황 조회
app.get('/api/admin/students-list', (req, res) => {
    const list = Object.keys(SYSTEM_DATA.studentRegistrations).map(key => {
        const student = SYSTEM_DATA.studentRegistrations[key];
        const classNames = student.classes.map(id => {
            const c = SYSTEM_DATA.CLASSES.find(item => item.id === id);
            return c ? c.name : null;
        }).filter(Boolean).join(', ');
        return { grade: student.grade, name: student.name, password: student.password, registeredClasses: classNames || "없음" };
    });
    res.json(list);
});

// 5. 관리자: 새 학기 데이터 전체 초기화 API 🔄
app.post('/api/admin/reset-data', (req, res) => {
    try {
        SYSTEM_DATA.studentRegistrations = {};
        saveToFile();
        res.json({ success: true, message: "지난 학기 수강 신청 데이터가 성공적으로 초기화되었습니다. 이제 새 학기 명단을 올리실 수 있습니다." });
    } catch (err) {
        console.error("❌ 데이터 초기화 중 오류 발생:", err);
        res.status(500).json({ success: false, message: "초기화 중 서버 오류가 발생했습니다." });
    }
});

// 6. 학생: 내 신청 내