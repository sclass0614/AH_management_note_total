// Supabase 클라이언트는 supabase.js에서 이미 초기화됨

// 전역 변수
let currentDate = new Date().toISOString().split('T')[0].replace(/-/g, ''); // 오늘 날짜 (YYYYMMDD 형식)
let managementNoteData = []; // management_note_total 데이터
let individualWorkData = []; // management_note_individual 데이터
let employeesInfoData = []; // employeesinfo 데이터
let originalData = null; // 카테고리 선택 시 원본 데이터 저장 (동시 편집 충돌 방지용)
let attendanceData = []; // activities_journal 데이터 (이용인원)
let membersInfoData = []; // membersinfo 데이터 (전체 회원 정보)

// DOM 요소들
const datePicker = document.getElementById('datePicker');
const updateReportBtn = document.getElementById('updateReportBtn');
const employeeNumberInput = document.getElementById('employeeNumber');
const employeeNameInput = document.getElementById('employeeName');
const categorySelect = document.getElementById('categorySelect');
const contentTextarea = document.getElementById('contentTextarea');
const submitBtn = document.getElementById('submitBtn');
const printBtn = document.getElementById('printBtn');

// 보고서 요소들
const reportDate = document.getElementById('reportDate');
const handoverContent = document.getElementById('handoverContent');
const elderlyContent = document.getElementById('elderlyContent');
const basicRulesContent = document.getElementById('basicRulesContent');
const otherMattersContent = document.getElementById('otherMattersContent');
const individualWorkTableBody = document.getElementById('individualWorkTableBody');

// 회원 운영현황 요소들
const capacityCountCell = document.getElementById('capacityCountCell');
const capacityDetailCell = document.getElementById('capacityDetailCell');
const currentMemberCountCell = document.getElementById('currentMemberCountCell');
const currentMemberDetailCell = document.getElementById('currentMemberDetailCell');
const attendanceCountCell = document.getElementById('attendanceCountCell');
const attendanceDetailCell = document.getElementById('attendanceDetailCell');
const absentCountCell = document.getElementById('absentCountCell');
const absentListCell = document.getElementById('absentListCell');
const restDayCountCell = document.getElementById('restDayCountCell');
const restDayListCell = document.getElementById('restDayListCell');

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== 페이지 로드 시작 ===');
    console.log('현재 URL:', window.location.href);
    console.log('페이지 제목:', document.title);
    
    initializePage();
    loadEmployeeNumberFromURL(); // URL에서 직원번호 로드
    setupPostMessageListener(); // PostMessage 리스너 설정
    
    console.log('=== 페이지 로드 완료 ===');
});

// 페이지 초기화
function initializePage() {
    // 오늘 날짜로 date picker 설정 (YYYY-MM-DD 형식)
    const today = new Date().toISOString().split('T')[0];
    datePicker.value = today;
    
    // 보고서 날짜 표시
    updateReportDate();
    
    // 이벤트 리스너 등록
    setupEventListeners();
    
    // 초기 데이터 로드
    loadReportData();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 날짜 변경 시
    datePicker.addEventListener('change', function() {
        // YYYY-MM-DD 형식을 YYYYMMDD 형식으로 변환
        currentDate = this.value.replace(/-/g, '');
        updateReportDate();
        // 날짜가 변경되면 데이터를 새로 가져오기
        loadReportData();
    });
    
    // 보고서 업데이트 버튼
    updateReportBtn.addEventListener('click', loadReportData);
    
    // 인쇄 버튼
    printBtn.addEventListener('click', printReport);
    
    // 입력 버튼
    submitBtn.addEventListener('click', submitData);
    
    // 휴무자 편집 가능 셀 이벤트
    setupEditableCells();
    
    // 카테고리 변경 시
    categorySelect.addEventListener('change', function() {
        if (this.value) {
            // 카테고리가 선택되면 해당 카테고리의 첫 번째 데이터에서 직원 정보 가져오기
            const categoryData = managementNoteData.filter(item => item.카테고리 === this.value);
            if (categoryData.length > 0) {
                const firstData = categoryData[0];
                employeeNumberInput.value = firstData.직원번호 || '';
                employeeNameInput.value = firstData.직원명 || '';
            }
            // 해당 카테고리의 모든 내용을 textarea에 로드
            loadCategoryContent(this.value);
        } else {
            // 카테고리가 선택되지 않으면 내용을 비움
            contentTextarea.value = '';
            employeeNumberInput.value = '';
            employeeNameInput.value = '';
        }
    });
}

// 보고서 날짜 업데이트
function updateReportDate() {
    // YYYYMMDD 형식을 Date 객체로 변환
    const year = currentDate.substring(0, 4);
    const month = currentDate.substring(4, 6);
    const day = currentDate.substring(6, 8);
    const date = new Date(year, month - 1, day);
    
    // yyyy.mm.dd(요일) 형식으로 포맷팅
    const yearStr = year;
    const monthStr = month.padStart(2, '0');
    const dayStr = day.padStart(2, '0');
    
    // 요일을 한글 약자로 변환
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    
    const formattedDate = `${yearStr}.${monthStr}.${dayStr}(${weekday})`;
    reportDate.textContent = formattedDate;
}

// Supabase에서 데이터 로드
async function loadReportData() {
    try {
        console.log('데이터 로딩 시작...');
        console.log('현재 날짜 (YYYYMMDD):', currentDate);
        
        // management_note_total 데이터 로드
        const { data: totalData, error: totalError } = await supabase
            .from('management_note_total')
            .select('*')
            .eq('날짜', currentDate);
        
        if (totalError) {
            console.error('management_note_total 로드 에러:', totalError);
            return;
        }
        
        managementNoteData = totalData || [];
        console.log('management_note_total 데이터:', managementNoteData);
        
        // management_note_individual 데이터 로드
        const { data: individualData, error: individualError } = await supabase
            .from('management_note_individual')
            .select('*')
            .eq('날짜', currentDate);
        
        if (individualError) {
            console.error('management_note_individual 로드 에러:', individualError);
            return;
        }
        
        individualWorkData = individualData || [];
        console.log('management_note_individual 데이터:', individualWorkData);
        
        // employeesinfo 데이터 로드
        const { data: employeesData, error: employeesError } = await supabase
            .from('employeesinfo')
            .select('직원번호, 담당직종');
        
        if (employeesError) {
            console.error('employeesinfo 로드 에러:', employeesError);
            return;
        }
        
        employeesInfoData = employeesData || [];
        console.log('employeesinfo 데이터:', employeesInfoData);
        
        // activities_journal 데이터 로드 (이용인원)
        const { data: attendanceDataResult, error: attendanceError } = await supabase
            .from('activities_journal')
            .select('회원번호, 회원명')
            .eq('날짜', currentDate);
        
        if (attendanceError) {
            console.error('activities_journal 로드 에러:', attendanceError);
            return;
        }
        
        attendanceData = attendanceDataResult || [];
        console.log('activities_journal 데이터:', attendanceData);
        
        // membersinfo 데이터 로드 (전체 회원 정보)
        const { data: membersData, error: membersError } = await supabase
            .from('membersinfo')
            .select('회원번호, 회원명, 입소일, 퇴소일');
        
        if (membersError) {
            console.error('membersinfo 로드 에러:', membersError);
            return;
        }
        
        membersInfoData = membersData || [];
        console.log('membersinfo 데이터:', membersInfoData);
        
        // UI 업데이트
        updateReportUI();
        
    } catch (error) {
        console.error('데이터 로드 중 예외 발생:', error);
    }
}

// 보고서 UI 업데이트
function updateReportUI() {
    // 회원 운영현황 업데이트
    updateMemberStatus();
    
    // 전달사항 업데이트
    const handoverData = managementNoteData.filter(item => item.카테고리 === '전달사항');
    handoverContent.value = handoverData.map(item => item.내용).join('\n\n');
    adjustReportTextareaHeight(handoverContent);
    
    // 어르신 특이사항 업데이트
    const elderlyData = managementNoteData.filter(item => item.카테고리 === '어르신 특이사항');
    elderlyContent.value = elderlyData.map(item => item.내용).join('\n\n');
    adjustReportTextareaHeight(elderlyContent);
    
    // 기본규칙 업데이트
    const basicRulesData = managementNoteData.filter(item => item.카테고리 === '기본규칙');
    basicRulesContent.value = basicRulesData.map(item => item.내용).join('\n\n');
    adjustReportTextareaHeight(basicRulesContent);
    
    // 기타사항 업데이트
    const otherMattersData = managementNoteData.filter(item => item.카테고리 === '기타사항');
    otherMattersContent.value = otherMattersData.map(item => item.내용).join('\n\n');
    adjustReportTextareaHeight(otherMattersContent);
    
    // 개인업무일지 테이블 업데이트
    updateIndividualWorkTable();
}

// 회원 운영현황 업데이트
function updateMemberStatus() {
    // 현재 날짜 기준으로 입소 중인 회원 필터링
    const currentMembers = membersInfoData.filter(member => {
        const 입소일 = member.입소일 || '';
        const 퇴소일 = member.퇴소일 || '';
        
        // 입소일이 현재 날짜보다 이전이고, 퇴소일이 없거나 현재 날짜보다 이후인 경우
        return 입소일 <= currentDate && (퇴소일 === '' || 퇴소일 > currentDate);
    });
    
    // 현원 계산 (입소 중인 회원 수)
    const currentMemberCountValue = currentMembers.length;
    currentMemberCountCell.textContent = `${currentMemberCountValue}명`;
    
    // 이용인원 계산 (중복 제거된 회원번호 개수)
    const uniqueAttendanceMembers = [...new Set(attendanceData.map(item => item.회원번호))];
    const attendanceCountValue = uniqueAttendanceMembers.length;
    attendanceCountCell.textContent = `${attendanceCountValue}명`;
    
    // 결석자 계산 (입소 중인 회원 중 이용하지 않은 회원)
    const attendanceMemberNumbers = new Set(uniqueAttendanceMembers);
    const absentMembers = currentMembers.filter(member => 
        !attendanceMemberNumbers.has(member.회원번호)
    );
    
    const absentCountValue = absentMembers.length;
    absentCountCell.textContent = `${absentCountValue}명`;
    
    // 결석자 명단 표시 (자동 계산된 결과를 초기값으로 설정)
    if (absentMembers.length > 0) {
        const absentNames = absentMembers.map(member => member.회원명).join('어르신, ') + '어르신';
        absentListCell.textContent = absentNames;
    } else {
        absentListCell.textContent = '';
    }
    
    // 휴무자 수는 더 이상 자동 업데이트하지 않음 (사용자가 직접 편집)
}

// 편집 가능 셀 설정
function setupEditableCells() {
    // 정원 수 셀
    capacityCountCell.addEventListener('dblclick', function() {
        makeCellEditable(this, 'count');
    });
    
    // 정원 상세 셀
    capacityDetailCell.addEventListener('dblclick', function() {
        makeCellEditable(this, 'list');
    });
    
    // 현원 수 셀
    currentMemberCountCell.addEventListener('dblclick', function() {
        makeCellEditable(this, 'count');
    });
    
    // 현원 상세 셀
    currentMemberDetailCell.addEventListener('dblclick', function() {
        makeCellEditable(this, 'list');
    });
    
    // 이용인원 수 셀
    attendanceCountCell.addEventListener('dblclick', function() {
        makeCellEditable(this, 'count');
    });
    
    // 이용인원 상세 셀
    attendanceDetailCell.addEventListener('dblclick', function() {
        makeCellEditable(this, 'list');
    });
    
    // 결석자 수 셀
    absentCountCell.addEventListener('dblclick', function() {
        makeCellEditable(this, 'count');
    });
    
    // 결석자 명단 셀
    absentListCell.addEventListener('dblclick', function() {
        makeCellEditable(this, 'list');
    });
    
    // 휴무자 수 셀
    restDayCountCell.addEventListener('dblclick', function() {
        makeCellEditable(this, 'count');
    });
    
    // 휴무자 명단 셀
    restDayListCell.addEventListener('dblclick', function() {
        makeCellEditable(this, 'list');
    });
}

// 셀을 편집 가능하게 만들기
function makeCellEditable(cell, type) {
    if (cell.classList.contains('editing')) return;
    
    const originalText = cell.textContent.replace('명', '').trim();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = type === 'count' ? originalText : originalText;
    input.className = 'cell-input';
    
    cell.classList.add('editing');
    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    input.select();
    
    // Enter 키로 저장
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            saveCellEdit(cell, type, input.value);
        } else if (e.key === 'Escape') {
            cancelCellEdit(cell, type, originalText);
        }
    });
    
    // 포커스 아웃 시 저장
    input.addEventListener('blur', function() {
        saveCellEdit(cell, type, input.value);
    });
}

// 셀 편집 저장
function saveCellEdit(cell, type, value) {
    cell.classList.remove('editing');
    
    if (type === 'count') {
        const count = value.trim() ? parseInt(value) : 0;
        cell.textContent = `${count}명`;
    } else if (type === 'list') {
        cell.textContent = value.trim();
    }
}

// 셀 편집 취소
function cancelCellEdit(cell, type, originalText) {
    cell.classList.remove('editing');
    
    if (type === 'count') {
        cell.textContent = `${originalText}명`;
    } else if (type === 'list') {
        cell.textContent = originalText;
    }
}

// 개인업무일지 테이블 업데이트
function updateIndividualWorkTable() {
    // 테이블 내용 초기화
    individualWorkTableBody.innerHTML = '';
    
    if (individualWorkData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="4" style="text-align: center; color: #666;">등록된 개인업무가 없습니다.</td>';
        individualWorkTableBody.appendChild(emptyRow);
        return;
    }
    
    // 담당직종 우선순위 정의
    const 직종우선순위 = {
        '시설장': 1,
        '사무국장': 2,
        '사회복지사': 3,
        '작업치료사': 4,
        '요양보호사': 5,
        '사무원': 6,
        '조리원': 7,
        '운전원': 8
    };
    
    // 데이터에 담당직종 정보 추가 및 정렬
    const processedData = individualWorkData.map(item => {
        // 직원번호로 담당직종 찾기 (대소문자 구분 없이)
        const employeeInfo = employeesInfoData.find(emp => 
            emp.직원번호 && item.직원번호 && 
            emp.직원번호.toLowerCase() === item.직원번호.toLowerCase()
        );
        const 담당직종 = employeeInfo ? employeeInfo.담당직종 : '';
        
        return {
            ...item,
            담당직종: 담당직종,
            직종우선순위: 직종우선순위[담당직종] || 999 // 정의되지 않은 직종은 마지막에
        };
    });
    
    // 정렬: 담당직종 → 직원번호 → 직원명
    processedData.sort((a, b) => {
        // 1. 담당직종 우선순위로 정렬
        if (a.직종우선순위 !== b.직종우선순위) {
            return a.직종우선순위 - b.직종우선순위;
        }
        
        // 2. 직원번호로 정렬
        if (a.직원번호 !== b.직원번호) {
            return (a.직원번호 || '').localeCompare(b.직원번호 || '');
        }
        
        // 3. 직원명으로 정렬
        return (a.직원명 || '').localeCompare(b.직원명 || '');
    });
    
    // 그룹별로 데이터 정리
    const groupedData = {};
    processedData.forEach(item => {
        const groupKey = `${item.담당직종}|${item.직원번호}|${item.직원명}`;
        if (!groupedData[groupKey]) {
            groupedData[groupKey] = {
                담당직종: item.담당직종,
                직원번호: item.직원번호,
                직원명: item.직원명,
                업무내용들: []
            };
        }
        groupedData[groupKey].업무내용들.push(item.업무내용);
    });
    
    // 그룹별로 테이블 행 생성 (rowspan 포함)
    Object.values(groupedData).forEach(group => {
        const workCount = group.업무내용들.length;
        
        // 첫 번째 행 생성 (모든 정보 포함)
        const firstRow = document.createElement('tr');
        firstRow.innerHTML = `
            <td rowspan="${workCount}">${group.담당직종 || ''}</td>
            <td rowspan="${workCount}">${group.직원번호 || ''}</td>
            <td rowspan="${workCount}">${group.직원명 || ''}</td>
            <td>${group.업무내용들[0] || ''}</td>
        `;
        individualWorkTableBody.appendChild(firstRow);
        
        // 추가 업무내용이 있으면 별도 행으로 추가 (앞 3개 셀은 rowspan으로 처리됨)
        for (let i = 1; i < group.업무내용들.length; i++) {
            const additionalRow = document.createElement('tr');
            additionalRow.innerHTML = `
                <td>${group.업무내용들[i]}</td>
            `;
            individualWorkTableBody.appendChild(additionalRow);
        }
    });
}

// 카테고리별 내용 로드 (편집용)
function loadCategoryContent(category) {
    // 해당 카테고리의 첫 번째 데이터만 가져오기 (하나의 카테고리당 하나의 데이터만 존재)
    const categoryData = managementNoteData.filter(item => item.카테고리 === category);
    if (categoryData.length > 0) {
        const firstData = categoryData[0];
        contentTextarea.value = firstData.내용 || '';
        // 기존 데이터의 ID를 저장 (업데이트용)
        contentTextarea.dataset.existingId = firstData.id;
        
        // 원본 데이터 저장 (동시 편집 충돌 방지용)
        originalData = {
            id: firstData.id,
            직원번호: firstData.직원번호 || '',
            직원명: firstData.직원명 || '',
            내용: firstData.내용 || ''
        };
    } else {
        contentTextarea.value = '';
        contentTextarea.dataset.existingId = '';
        originalData = null;
    }
    
    // textarea 높이 자동 조정
    adjustTextareaHeight();
}

// 데이터 입력 처리
async function submitData() {
    // 입력값 검증
    const employeeNumber = employeeNumberInput.value.trim();
    const employeeName = employeeNameInput.value.trim();
    const category = categorySelect.value;
    const content = contentTextarea.value.trim();
    const existingId = contentTextarea.dataset.existingId;
    
    if (!category || !content) {
        await customAlert('카테고리와 내용을 입력해주세요.', '입력 확인');
        return;
    }
    
    try {
        let result;
        
        if (existingId) {
            // 기존 데이터가 있으면 서버의 최신 데이터 확인
            console.log('기존 데이터 업데이트:', existingId);
            
            // 서버에서 최신 데이터 가져오기
            const { data: serverData, error: fetchError } = await supabase
                .from('management_note_total')
                .select('*')
                .eq('id', existingId)
                .single();
            
            if (fetchError) {
                console.error('서버 데이터 조회 에러:', fetchError);
                await customAlert('서버 데이터 조회 중 오류가 발생했습니다.', '오류');
                return;
            }
            
            // 원본 데이터와 서버 데이터 비교
            if (originalData && serverData.내용 !== originalData.내용) {
                // 다른 사용자가 수정한 경우 모달 표시
                showConflictModal(serverData);
                return;
            }
            
            // 충돌이 없으면 업데이트 진행
            const { data, error } = await supabase
                .from('management_note_total')
                .update({
                    직원번호: employeeNumber,
                    직원명: employeeName,
                    내용: content
                })
                .eq('id', existingId);
            
            if (error) {
                console.error('데이터 업데이트 에러:', error);
                await customAlert('데이터 업데이트 중 오류가 발생했습니다.', '오류');
                return;
            }
            
            result = data;
            console.log('데이터 업데이트 성공:', result);
        } else {
            // 새 데이터 삽입
            console.log('새 데이터 삽입');
            const { data, error } = await supabase
                .from('management_note_total')
                .insert([
                    {
                        직원번호: employeeNumber,
                        직원명: employeeName,
                        날짜: currentDate, // YYYYMMDD 형식
                        카테고리: category,
                        내용: content
                    }
                ]);
            
            if (error) {
                console.error('데이터 입력 에러:', error);
                await customAlert('데이터 입력 중 오류가 발생했습니다.', '오류');
                return;
            }
            
            result = data;
            console.log('데이터 입력 성공:', result);
        }
        
        // 입력 폼 초기화
        clearForm();
        
        // 보고서 데이터 다시 로드
        await loadReportData();
        
        await customAlert(
            existingId ? '데이터가 성공적으로 업데이트되었습니다.' : '데이터가 성공적으로 입력되었습니다.',
            '완료'
        );
        
    } catch (error) {
        console.error('데이터 처리 중 예외 발생:', error);
        await customAlert('데이터 처리 중 오류가 발생했습니다.', '오류');
    }
}

// textarea 높이 자동 조정 함수
function adjustTextareaHeight() {
    const textarea = contentTextarea;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// 보고서 textarea 높이 자동 조정 함수
function adjustReportTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// 충돌 모달 표시 함수
function showConflictModal(serverData) {
    const modalHtml = `
        <div id="conflictModal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>⚠️ 동시 편집 충돌 감지</h3>
                </div>
                <div class="modal-body">
                    <p>다른 사용자가 동시에 이 내용을 수정했습니다.</p>
                    <div class="conflict-info">
                        <h4>서버의 최신 데이터:</h4>
                        <div class="info-item">
                            <strong>직원번호:</strong> ${serverData.직원번호 || '없음'}
                        </div>
                        <div class="info-item">
                            <strong>직원명:</strong> ${serverData.직원명 || '없음'}
                        </div>
                                                 <div class="info-item">
                             <strong>내용:</strong>
                             <div class="content-preview">${serverData.내용 ? serverData.내용.replace(/\n/g, '\n') : '없음'}</div>
                         </div>
                    </div>
                    <p class="warning-text">계속 진행하시겠습니까? 현재 입력한 내용으로 덮어쓰게 됩니다.</p>
                </div>
                <div class="modal-footer">
                    <button id="continueBtn" class="btn-primary">계속 진행</button>
                    <button id="cancelBtn" class="btn-secondary">취소</button>
                </div>
            </div>
        </div>
    `;
    
    // 모달을 body에 추가
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 모달 이벤트 리스너
    document.getElementById('continueBtn').addEventListener('click', async function() {
        // 사용자가 계속 진행을 선택한 경우 강제 업데이트
        await forceUpdate();
        closeConflictModal();
    });
    
    document.getElementById('cancelBtn').addEventListener('click', function() {
        closeConflictModal();
    });
    
    // 모달 외부 클릭 시 닫기
    document.getElementById('conflictModal').addEventListener('click', function(e) {
        if (e.target.id === 'conflictModal') {
            closeConflictModal();
        }
    });
}

// 강제 업데이트 함수
async function forceUpdate() {
    const employeeNumber = employeeNumberInput.value.trim();
    const employeeName = employeeNameInput.value.trim();
    const content = contentTextarea.value.trim();
    const existingId = contentTextarea.dataset.existingId;
    
    try {
        const { data, error } = await supabase
            .from('management_note_total')
            .update({
                직원번호: employeeNumber,
                직원명: employeeName,
                내용: content
            })
            .eq('id', existingId);
        
        if (error) {
            console.error('강제 업데이트 에러:', error);
            await customAlert('데이터 업데이트 중 오류가 발생했습니다.', '오류');
            return;
        }
        
        console.log('강제 업데이트 성공:', data);
        
        // 입력 폼 초기화
        clearForm();
        
        // 보고서 데이터 다시 로드
        await loadReportData();
        
        await customAlert('데이터가 성공적으로 업데이트되었습니다.', '완료');
        
    } catch (error) {
        console.error('강제 업데이트 중 예외 발생:', error);
        await customAlert('데이터 업데이트 중 오류가 발생했습니다.', '오류');
    }
}

// 충돌 모달 닫기 함수
function closeConflictModal() {
    const modal = document.getElementById('conflictModal');
    if (modal) {
        modal.remove();
    }
}

// 입력 폼 초기화
function clearForm() {
    employeeNumberInput.value = '';
    employeeNameInput.value = '';
    categorySelect.value = '';
    contentTextarea.value = '';
    // 기존 데이터 ID 초기화
    contentTextarea.dataset.existingId = '';
    // 원본 데이터 초기화
    originalData = null;
    // textarea 높이 초기화
    contentTextarea.style.height = 'auto';
}



// 유틸리티 함수: 날짜 포맷팅
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// 유틸리티 함수: 현재 시간 가져오기
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 디버깅용 로그 함수
function logData() {
    console.log('현재 날짜 (YYYYMMDD):', currentDate);
    console.log('management_note_total 데이터:', managementNoteData);
    console.log('management_note_individual 데이터:', individualWorkData);
}

// 인쇄 함수
function printReport() {
    // 인쇄 전에 현재 보고서 데이터가 최신인지 확인
    console.log('인쇄 시작...');
    
    // 브라우저의 인쇄 기능 호출
    window.print();
}

// 전역 함수로 노출 (디버깅용)
window.logData = logData;
window.loadReportData = loadReportData;
window.printReport = printReport;

// 커스텀 Alert 함수
function customAlert(message, title = '알림') {
    return new Promise((resolve) => {
        const modalHtml = `
            <div class="custom-modal">
                <div class="custom-modal-content">
                    <div class="custom-modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="custom-modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="custom-modal-footer">
                        <button class="custom-btn custom-btn-primary" id="customAlertOk">확인</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.querySelector('.custom-modal');
        const okBtn = document.getElementById('customAlertOk');
        
        const closeModal = () => {
            modal.remove();
            resolve();
        };
        
        okBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Enter 키로 확인
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                closeModal();
                document.removeEventListener('keydown', handleKeyPress);
            }
        };
        document.addEventListener('keydown', handleKeyPress);
    });
}

// 커스텀 Confirm 함수
function customConfirm(message, title = '확인') {
    return new Promise((resolve) => {
        const modalHtml = `
            <div class="custom-modal">
                <div class="custom-modal-content">
                    <div class="custom-modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="custom-modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="custom-modal-footer">
                        <button class="custom-btn custom-btn-secondary" id="customConfirmCancel">취소</button>
                        <button class="custom-btn custom-btn-primary" id="customConfirmOk">확인</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.querySelector('.custom-modal');
        const okBtn = document.getElementById('customConfirmOk');
        const cancelBtn = document.getElementById('customConfirmCancel');
        
        const closeModal = (result) => {
            modal.remove();
            resolve(result);
        };
        
        okBtn.addEventListener('click', () => closeModal(true));
        cancelBtn.addEventListener('click', () => closeModal(false));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(false);
        });
        
        // Enter 키로 확인, Escape 키로 취소
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                closeModal(true);
                document.removeEventListener('keydown', handleKeyPress);
            } else if (e.key === 'Escape') {
                closeModal(false);
                document.removeEventListener('keydown', handleKeyPress);
            }
        };
        document.addEventListener('keydown', handleKeyPress);
    });
}

// 기존 alert/confirm을 커스텀 버전으로 교체
window.alert = customAlert;
window.confirm = customConfirm;

// 직원번호 가져오기 (모든 방법 지원)
function loadEmployeeNumberFromURL() {
    console.log('=== 직원번호 로드 시작 ===');
    let employeeNumber = null;
    
    // 1. URL 파라미터에서 확인 (empNo 파라미터)
    const urlParams = new URLSearchParams(window.location.search);
    const empNoFromURL = urlParams.get('empNo');
    const employeeNumberFromURL = urlParams.get('employeeNumber');
    employeeNumber = empNoFromURL || employeeNumberFromURL;
    
    console.log('URL 파라미터 확인:');
    console.log('- empNo:', empNoFromURL);
    console.log('- employeeNumber:', employeeNumberFromURL);
    console.log('- 최종 URL 결과:', employeeNumber);
    
    // 2. sessionStorage에서 확인
    if (!employeeNumber) {
        const empNoFromSession = sessionStorage.getItem('empNo');
        const currentUserFromSession = sessionStorage.getItem('currentUser');
        const userInfoFromSession = sessionStorage.getItem('userInfo');
        
        employeeNumber = empNoFromSession || currentUserFromSession || userInfoFromSession;
        
        console.log('sessionStorage 확인:');
        console.log('- empNo:', empNoFromSession);
        console.log('- currentUser:', currentUserFromSession);
        console.log('- userInfo:', userInfoFromSession);
        console.log('- 최종 sessionStorage 결과:', employeeNumber);
    }
    
    // 3. localStorage에서 확인
    if (!employeeNumber) {
        const employeeNumberFromLocal = localStorage.getItem('employeeNumber');
        employeeNumber = employeeNumberFromLocal;
        
        console.log('localStorage 확인:');
        console.log('- employeeNumber:', employeeNumberFromLocal);
        console.log('- 최종 localStorage 결과:', employeeNumber);
    }
    
    // 4. userInfo 요소에서 확인
    if (!employeeNumber) {
        const userInfoElement = document.getElementById('userInfo');
        console.log('userInfo 요소 확인:');
        console.log('- userInfo 요소 존재:', !!userInfoElement);
        
        if (userInfoElement) {
            const userInfoText = userInfoElement.textContent;
            console.log('- userInfo 텍스트:', userInfoText);
            
            const match = userInfoText.match(/([A-Za-z0-9]+)\s*님/);
            console.log('- 정규식 매치 결과:', match);
            
            employeeNumber = match ? match[1].toLowerCase() : null;
            console.log('- userInfo에서 추출한 직원번호:', employeeNumber);
        }
    }
    
    console.log('=== 최종 직원번호 결과:', employeeNumber, '===');
    
    if (employeeNumber) {
        // 직원번호 입력필드에 설정
        employeeNumberInput.value = employeeNumber;
        console.log('직원번호 입력필드에 설정됨:', employeeNumberInput.value);
        
        // 직원번호가 있으면 직원명도 자동으로 가져오기
        loadEmployeeName(employeeNumber);
        
        console.log('직원번호 자동 설정 완료:', employeeNumber);
    } else {
        console.log('❌ 직원번호를 찾을 수 없습니다!');
        console.log('현재 URL:', window.location.href);
        console.log('현재 페이지 제목:', document.title);
    }
}

// 직원번호로 직원명 가져오기 (선택사항)
async function loadEmployeeName(employeeNumber) {
    console.log('=== 직원명 로드 시작 ===');
    console.log('조회할 직원번호:', employeeNumber);
    
    try {
        // employeesinfo 테이블에서 직원명 조회
        const { data: employeeData, error } = await supabase
            .from('employeesinfo')
            .select('직원명')
            .eq('직원번호', employeeNumber)
            .single();
        
        console.log('Supabase 쿼리 결과:');
        console.log('- data:', employeeData);
        console.log('- error:', error);
        
        if (employeeData && !error) {
            employeeNameInput.value = employeeData.직원명 || '';
            console.log('직원명 설정 완료:', employeeNameInput.value);
        } else {
            console.log('직원명 조회 실패 또는 데이터 없음');
        }
    } catch (error) {
        console.log('직원명 로드 실패:', error);
    }
    
    console.log('=== 직원명 로드 완료 ===');
}

// PostMessage 통신 설정
function setupPostMessageListener() {
    console.log('=== PostMessage 리스너 설정 시작 ===');
    
    // PostMessage로 직원번호 요청
    window.addEventListener('message', function(event) {
        console.log('PostMessage 수신:', event.data);
        
        if (event.data && event.data.type === 'requestUserInfo') {
            console.log('직원번호 요청 메시지 수신');
            const currentUserEmpNo = getCurrentEmployeeNumber();
            console.log('현재 직원번호:', currentUserEmpNo);
            
            if (currentUserEmpNo) {
                event.source.postMessage({
                    type: 'userInfo',
                    userId: currentUserEmpNo,
                    empNo: currentUserEmpNo,
                    user: currentUserEmpNo
                }, '*');
                console.log('PostMessage로 직원번호 전송:', currentUserEmpNo);
            }
        } else if (event.data && event.data.type === 'userInfo') {
            console.log('직원번호 정보 수신:', event.data);
            if (event.data.empNo) {
                console.log('PostMessage로 받은 직원번호:', event.data.empNo);
                employeeNumberInput.value = event.data.empNo;
                loadEmployeeName(event.data.empNo);
            }
        }
    });
    
    // 부모 창에 직원번호 요청
    if (window.opener) {
        console.log('부모 창 존재, 직원번호 요청 전송');
        window.opener.postMessage({ type: 'requestUserInfo' }, '*');
    } else {
        console.log('부모 창 없음 (window.opener가 null)');
    }
    
    console.log('=== PostMessage 리스너 설정 완료 ===');
}

// 현재 직원번호 가져오기
function getCurrentEmployeeNumber() {
    // 1. 입력필드에서 확인
    if (employeeNumberInput.value) {
        return employeeNumberInput.value;
    }
    
    // 2. sessionStorage에서 확인
    let employeeNumber = sessionStorage.getItem('empNo') || 
                        sessionStorage.getItem('currentUser') || 
                        sessionStorage.getItem('userInfo');
    
    // 3. localStorage에서 확인
    if (!employeeNumber) {
        employeeNumber = localStorage.getItem('employeeNumber');
    }
    
    // 4. userInfo 요소에서 확인
    if (!employeeNumber) {
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            const userInfoText = userInfoElement.textContent;
            const match = userInfoText.match(/([A-Za-z0-9]+)\s*님/);
            employeeNumber = match ? match[1].toLowerCase() : null;
        }
    }
    
    return employeeNumber;
}
