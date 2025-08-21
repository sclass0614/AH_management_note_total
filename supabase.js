// Supabase API 키 및 URL 상수
const SUPABASE_URL = "https://dfomeijvzayyszisqflo.supabase.co";
const SUPABASE_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb21laWp2emF5eXN6aXNxZmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDg2NjA0MiwiZXhwIjoyMDYwNDQyMDQyfQ.K4VKm-nYlbODIEvO9P6vfKsvhLGQkY3Kgs-Fx36Ir-4"
//service rollkey사용해야함

// 전역 Supabase 클라이언트 변수
let supabaseClient = null;

function initSupabase() {
  // 이미 생성되어 있으면 재사용
  if (supabaseClient) {
    console.log("🔄 Supabase 클라이언트를 재사용합니다.");
    return supabaseClient;
  }
  
  // Supabase 라이브러리가 로드되었는지 확인
  if (typeof supabase !== 'undefined') {
    try {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log("✅ Supabase 클라이언트가 새로 생성되었습니다.");
      console.log("URL:", SUPABASE_URL);
      console.log("API Key:", SUPABASE_KEY.substring(0, 20) + "...");
      return supabaseClient;
    } catch (error) {
      console.error("❌ Supabase 클라이언트 생성 실패:", error);
      return null;
    }
  } else {
    console.error("❌ Supabase 라이브러리가 로드되지 않았습니다.");
    return null;
  }
}

// DOM이 로드된 후 Supabase 클라이언트 초기화
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM 로드됨 - Supabase 클라이언트 초기화 시작");
  supabaseClient = initSupabase();
  
  if (supabaseClient) {
    console.log("✅ Supabase 클라이언트 초기화 완료");
  } else {
    console.error("❌ Supabase 클라이언트 초기화 실패");
  }
});

// 직원 정보를 가져오는 함수
async function getEmployeesInfo() {
  try {
    if (!supabaseClient) {
      console.error('Supabase 클라이언트가 초기화되지 않았습니다.');
      return [];
    }
    
    const { data, error } = await supabaseClient
      .from('employeesinfo')
      .select('직원번호, 직원명');
    
    if (error) {
      console.error('직원 정보 로드 에러:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('직원 정보 로드 중 예외 발생:', error);
    return [];
  }
}