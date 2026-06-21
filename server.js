const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 10000;

// 🚨 [중요] 1단계에서 복사한 선생님의 Supabase 주소와 API 키를 여기에 붙여넣으세요.
const SUPABASE_URL = '선생님의_SUPABASE_URL_입력';
const SUPABASE_KEY = '선생님의_SUPABASE_ANON_KEY_입력';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- [API 라우트 설정] ---

// 1. 신청 현황 및 가용한 인원 조회 (DB에서 실시간 불러오기)
app.get('/api/status', async (req, res) => {
    const { data, error } = await supabase
        .from('registrations')
        .select('*');
    
    if (error) {
        console.error("🔴 DB 로드 오류:", error);
        return res.status(500).json({ success: false, message: "데이터를 불러오지 못했습니다." });
    }
    res.json(data);
});

// 2. 방과후 수강 신청 처리 (DB에 안전하게 저장)
app.post('/api/register', async (req, res) => {
    const { studentId, studentName, className } = req.body;
    
    if (!studentId || !studentName || !className) {
        return res.status(400).json({ success: false, message: "모든 정보를 올바르게 입력해 주세요." });
    }

    // 중복 신청 방지 검사
    const { data: duplicateCheck, error: checkError } = await supabase
        .from('registrations')
        .select('*')
        .eq('studentId', studentId)
        .eq('className', className);

    if (duplicateCheck && duplicateCheck.length > 0) {
        return res.status(400).json({ success: false, message: "이미 신청 완료된 강좌입니다." });
    }

    // DB에 신청 내역 행 추가
    const { error: insertError } = await supabase
        .from('registrations')
        .insert([{ studentId, studentName, className }]);

    if (insertError) {
        console.error("🔴 DB 저장 오류:", insertError);
        return res.status(500).json({ success: false, message: "신청 처리 중 오류가 발생했습니다." });
    }

    res.json({ success: true, message: "방과후 학교 수강 신청이 완료되었습니다!" });
});

// 3. 관리자용: 데이터 전체 초기화 (새 학기 버튼 기능 - DB 비우기)
app.post('/api/admin/reset', async (req, res) => {
    // registrations 테이블의 모든 데이터를 삭제합니다.
    const { error } = await supabase
        .from('registrations')
        .delete()
        .neq('studentId', ''); // 모든 행을 선택하여 삭제하는 조건

    if (error) {
        console.error("🔴 DB 초기화 오류:", error);
        return res.status(500).json({ success: false, message: "초기화에 실패했습니다." });
    }

    console.log("🧹 Supabase DB의 모든 수강 신청 내역이 초기화되었습니다.");
    res.json({ success: true, message: "모든 신청 내역이 성공적으로 초기화되었습니다!" });
});

// 메인 페이지 라우팅
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버 구동
app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`⚡ SKS DB-Linked Server Running on Port ${PORT}`);
    console.log(`=============================================`);
});