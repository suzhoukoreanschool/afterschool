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

// 1. 기존 설정 로드 API
app.get('/api/classes', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('system_config')
            .select('*')
            .eq('id', 1)
            .maybeSingle();
        
        if (error || !data) {
            return res.json({
                titles: { mainTitle: '', subTitle: '' },
                config: { startTime: '', endTime: '' },
                classes: []
            });
        }
        
        // classes가 문자열로 저장되어 있을 경우를 대비해 안전하게 파싱 처리
        let parsedClasses = [];
        if (data.classes) {
            if (typeof data.classes === 'string') {
                try { parsedClasses = JSON.parse(data.classes); } catch(e) { parsedClasses = []; }
            } else if (Array.isArray(data.classes)) {
                parsedClasses = data.classes;
            }
        }
        
        res.json({
            titles: { mainTitle: data.maintitle || '', subTitle: data.subtitle || '' },
            config: { startTime: data.starttime || '', endTime: data.endtime || '' },
            classes: parsedClasses
        });
    } catch (err) {
        console.error("로드 오류:", err);
        res.status(500).json({ error: "설정 로드 실패" });
    }
});

// 2. 관리자 설정 일괄 반영 API (DB 형식 유연화 버전)
app.post('/api/admin/update', async (req, res) => {
    try {
        const { mainTitle, subTitle, startTime, endTime, classes } = req.body;
        
        // 날짜/시간 포맷 안전 검사
        let parsedStartTime = startTime || null;
        let parsedEndTime = endTime || null;
        
        // DB 컬럼 타입(JSONB 또는 TEXT) 무관하게 모두 호환되도록 호환 처리
        // Supabase upsert 실행
        const { error } = await supabase
            .from('system_config')
            .upsert({
                id: 1,
                maintitle: mainTitle || '',
                subtitle: subTitle || '',
                starttime: parsedStartTime,
                endtime: parsedEndTime,
                classes: classes // 만약 여기서 에러가 지속된다면 JSON.stringify(classes)로 자동 전환됨
            }, { onConflict: 'id' });

        if (error) {
            console.log("일반 Upsert 실패, 텍스트 변환 업서트 시도...");
            // JSONB 타입이 아니라 일반 글자(TEXT) 타입 컬럼일 경우를 대비한 2차 봉쇄 백업 로직
            const { error: retryError } = await supabase
                .from('system_config')
                .upsert({
                    id: 1,
                    maintitle: mainTitle || '',
                    subtitle: subTitle || '',
                    starttime: parsedStartTime,
                    endtime: parsedEndTime,
                    classes: JSON.stringify(classes || [])
                }, { onConflict: 'id' });
                
            if (retryError) throw retryError;
        }
        
        res.json({ success: true, message: "설정이 영구 저장되었습니다." });
    } catch (err) {
        console.error("서버 내부 저장 처리 최종 실패:", err);
        res.status(500).json({ 
            success: false, 
            message: err.message || "데이터베이스 저장 구조 에러" 
        });
    }
});

// 3. 학생 신청 명단 조회
app.get('/api/status', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('registrations')
            .select('*')
            .order('timestamp', { ascending: false });
        
        if (error) throw error;
        res.json(data || []);
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

// 5. 신청 내역 초기화
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/:page.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${req.params.page}.html`));
});

app.listen(PORT, () => {
    console.log(`⚡ 서버 정상 구동중 : 포트 ${PORT}`);
});
