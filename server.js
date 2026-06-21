const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 10000;

const SUPABASE_URL = 'https://qnjacyrowqetdyoxwwkk.supabase.co';
const SUPABASE_KEY = 'sb_secret_VAxfbhIQl8rTt_uoNpSrCQ_bdnj-oov';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 1. 관리자 화면 로딩 시 기존 설정(제목, 날짜, 강좌 배열) 불러오기
app.get('/api/classes', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('system_config')
            .select('*')
            .eq('id', 1)
            .single();
        
        if (error) throw error;
        
        // admin.html이 원하는 정확한 데이터 규격으로 리턴
        res.json({
            titles: { mainTitle: data.mainTitle, subTitle: data.subTitle },
            config: { startTime: data.startTime, endTime: data.endTime },
            classes: data.classes || []
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "설정 로드 실패" });
    }
});

// 2. 관리자 화면에서 "위 시스템 설정 일괄 반영하기" 버튼 눌렀을 때 DB에 영구 저장
app.post('/api/admin/update', async (req, res) => {
    try {
        const { mainTitle, subTitle, startTime, endTime, classes } = req.body;
        
        const { error } = await supabase
            .from('system_config')
            .upsert({
                id: 1,
                mainTitle,
                subTitle,
                startTime,
                endTime,
                classes: classes
            });

        if (error) throw error;
        res.json({ success: true, message: "설정이 영구 저장되었습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "설정 저장 실패" });
    }
});

// 3. 하단 신청 학생 명단 실시간 조회 (새로고침 대응)
app.get('/api/status', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('registrations')
            .select('*')
            .order('timestamp', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
});

// 4. 학생용 수강 신청 처리
app.post('/api/register', async (req, res) => {
    const { studentId, studentName, className } = req.body;
    try {
        const { data: duplicate } = await supabase
            .from('registrations')
            .select('*')
            .eq('studentId', studentId)
            .eq('className', className);

        if (duplicate && duplicate.length > 0) {
            return res.status(400).json({ success: false, message: "이미 신청 완료된 강좌입니다." });
        }

        const { error } = await supabase
            .from('registrations')
            .insert([{ studentId, studentName, className }]);

        if (error) throw error;
        res.json({ success: true, message: "신청이 완료되었습니다!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "신청 처리 오류" });
    }
});

// 5. 신청 내역 전체 초기화 구역
app.post('/api/admin/reset', async (req, res) => {
    try {
        const { error } = await supabase
            .from('registrations')
            .delete()
            .neq('studentId', '');

        if (error) throw error;
        res.json({ success: true, message: "모든 신청 내역이 성공적으로 초기화되었습니다!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "초기화 실패" });
    }
});

// 경로 기본 접속 연동
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/:page.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${req.params.page}.html`));
});

app.listen(PORT, () => {
    console.log(`⚡ 서버 정상 구동중 : 포트 ${PORT}`);
});
