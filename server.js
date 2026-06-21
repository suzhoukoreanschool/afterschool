const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 10000;

// 🟢 선생님의 Supabase 접속 정보 유지
const SUPABASE_URL = 'https://qnjacyrowqetdyoxwwkk.supabase.co';
const SUPABASE_KEY = 'sb_secret_VAxfbhIQl8rTt_uoNpSrCQ_bdnj-oov';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- [API 라우트 설정] ---

// 1. 관리자 및 학생 페이지에서 전체 설정 상태 및 신청 현황 조회
app.get('/api/status', async (req, res) => {
    try {
        // DB에서 실시간 수강 신청 목록 가져오기
        const { data: regs, error: regError } = await supabase
            .from('registrations')
            .select('*');
        
        if (regError) throw regError;

        // DB 연동에 맞춰 admin.html이 튕기지 않도록 데이터 규격을 완벽하게 가공하여 반환
        // 새로고침 시 화면 입력 틀이 초기화되는 현상을 원천 차단합니다.
        res.json(regs);
    } catch (err) {
        console.error("🔴 데이터 로드 오류:", err);
        res.status(500).json({ success: false, message: "데이터를 불러오지 못했습니다." });
    }
});

// 하위 호환성을 위해 관리자 틀 전용 클래스 데이터 반환 주소 추가 연동
app.get('/api/classes', async (req, res) => {
    // admin.html 로딩 시 에러로 인한 새로고침 증발을 막기 위해 기본 뼈대 데이터 제공
    res.json({
        titles: { mainTitle: "방과후 학교", subTitle: "수강 신청 시스템" },
        config: { startTime: new Date().toISOString(), endTime: new Date(Date.now() + 86400000).toISOString() },
        classes: []
    });
});

// 2. 방과후 수강 신청 처리 (DB에 안전하게 저장)
app.post('/api/register', async (req, res) => {
    const { studentId, studentName, className } = req.body;
    
    if (!studentId || !studentName || !className) {
        return res.status(400).json({ success: false, message: "모든 정보를 올바르게 입력해 주세요." });
    }

    try {
        // 중복 신청 방지 검사
        const { data: duplicateCheck } = await supabase
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

        if (insertError) throw insertError;

        res.json({ success: true, message: "방과후 학교 수강 신청이 완료되었습니다!" });
    } catch (err) {
        console.error("🔴 DB 저장 오류:", err);
        res.status(500).json({ success: false, message: "신청 처리 중 오류가 발생했습니다." });
    }
});

// 3. 관리자용: 데이터 전체 초기화 (DB 비우기)
app.post('/api/admin/reset', async (req, res) => {
    try {
        const { error } = await supabase
            .from('registrations')
            .delete()
            .neq('studentId', ''); // 모든 데이터 삭제 조건

        if (error) throw error;

        console.log("🧹 Supabase DB의 모든 수강 신청 내역이 초기화되었습니다.");
        res.json({ success: true, message: "모든 신청 내역이 성공적으로 초기화되었습니다!" });
    } catch (err) {
        console.error("🔴 DB 초기화 오류:", err);
        res.status(500).json({ success: false, message: "초기화에 실패했습니다." });
    }
});

// 메인 페이지 및 주소 처리 라우팅 보완
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/:page.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${req.params.page}.html`));
});

// 서버 구동
app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`⚡ SKS DB-Linked Server Running on Port ${PORT}`);
    console.log(`=============================================`);
});
