/**
 * 관리자용 학당 관리 JavaScript
 * Institute Management for Admin
 */

// 학당 관리 전역 변수
let currentInstitutes = [];
let currentEditingInstitute = null;

/**
 * 관리자용 학당 관리 초기화
 */
async function initializeInstituteManagement() {
    try {
        console.log('학당 관리 초기화 시작...');
        
        // 이벤트 리스너 설정
        setupInstituteEventListeners();
        
        // 학당 목록 로드
        await loadInstitutesList();
        
        console.log('학당 관리 초기화 완료');
        
    } catch (error) {
        console.error('학당 관리 초기화 오류:', error);
        Utils.showToast('학당 관리 초기화 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 이벤트 리스너 설정
 */
function setupInstituteEventListeners() {
    // 새 학당 추가 버튼
    Utils.on('#addInstituteBtn', 'click', () => showAddInstituteModal());
    
    // 모달 닫기 이벤트
    Utils.on('#addInstituteModal .close-btn', 'click', () => hideInstituteModal('add'));
    Utils.on('#editInstituteModal .close-btn', 'click', () => hideInstituteModal('edit'));
    Utils.on('#instituteDetailModal .close-btn', 'click', () => hideInstituteModal('detail'));
    
    // 배경 클릭으로 모달 닫기
    Utils.on('#addInstituteModal', 'click', (e) => {
        if (e.target.id === 'addInstituteModal') {
            hideInstituteModal('add');
        }
    });
    Utils.on('#editInstituteModal', 'click', (e) => {
        if (e.target.id === 'editInstituteModal') {
            hideInstituteModal('edit');
        }
    });
    Utils.on('#instituteDetailModal', 'click', (e) => {
        if (e.target.id === 'instituteDetailModal') {
            hideInstituteModal('detail');
        }
    });
    
    // 폼 제출 이벤트
    Utils.on('#addInstituteForm', 'submit', (e) => {
        e.preventDefault();
        handleAddInstitute();
    });
    Utils.on('#editInstituteForm', 'submit', (e) => {
        e.preventDefault();
        handleEditInstitute();
    });
    
    // 취소 버튼
    Utils.on('#addInstituteModal .cancel-btn', 'click', () => hideInstituteModal('add'));
    Utils.on('#editInstituteModal .cancel-btn', 'click', () => hideInstituteModal('edit'));
}

/**
 * 학당 목록 로드
 */
async function loadInstitutesList() {
    try {
        console.log('학당 목록 로드 시작...');
        
        const { data: institutes, error } = await supabase
            .from('institutes')
            .select(`
                *,
                cultural_programs(*)
            `)
            .order('created_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        currentInstitutes = institutes || [];
        console.log('로드된 학당:', currentInstitutes.length, '개');
        
        renderInstitutesList();
        
    } catch (error) {
        console.error('학당 목록 로드 오류:', error);
        const container = Utils.$('#instituteList');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i data-lucide="alert-circle"></i>
                    <p>학당 정보를 불러올 수 없습니다.</p>
                    <button class="btn secondary" onclick="loadInstitutesList()">다시 시도</button>
                </div>
            `;
        }
    }
}

/**
 * 학당 목록 렌더링
 */
function renderInstitutesList() {
    const container = Utils.$('#instituteList');
    if (!container) return;
    
    if (currentInstitutes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="building"></i>
                <h3>등록된 학당이 없습니다</h3>
                <p>새 학당을 추가해보세요.</p>
                <button class="btn primary" onclick="showAddInstituteModal()">
                    <i data-lucide="plus"></i>
                    새 학당 추가
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    currentInstitutes.forEach(institute => {
        const card = createInstituteCard(institute);
        container.appendChild(card);
    });
    
    // 아이콘 재생성
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * 학당 카드 생성
 */
function createInstituteCard(institute) {
    const card = Utils.createElement('div', 'institute-card');
    
    const programCount = institute.cultural_programs ? institute.cultural_programs.length : 0;
    const statusClass = institute.is_active ? 'active' : 'inactive';
    const statusText = institute.is_active ? '활성' : '비활성';
    
    card.innerHTML = `
        <div class="institute-card-header">
            <div class="institute-basic-info">
                <h3>${Utils.escapeHtml(institute.name_ko)}</h3>
                <p class="institute-name-en">${Utils.escapeHtml(institute.name_en)}</p>
                <p class="institute-location">
                    <i data-lucide="map-pin"></i>
                    ${Utils.escapeHtml(institute.city)}, ${Utils.escapeHtml(institute.country)}
                </p>
            </div>
            <div class="institute-status">
                <span class="status-badge ${statusClass}">${statusText}</span>
                <span class="program-count">${programCount}개 프로그램</span>
            </div>
        </div>
        
        <div class="institute-card-body">
            <div class="institute-details">
                <div class="detail-item">
                    <strong>운영기관:</strong> ${Utils.escapeHtml(institute.operator)}
                </div>
                <div class="detail-item">
                    <strong>담당자:</strong> ${Utils.escapeHtml(institute.contact_person)} 
                    ${institute.contact_email ? `(${Utils.escapeHtml(institute.contact_email)})` : ''}
                </div>
                <div class="detail-item">
                    <strong>연락처:</strong> ${Utils.escapeHtml(institute.phone)}
                </div>
                <div class="detail-item">
                    <strong>근무시간:</strong> ${Utils.escapeHtml(institute.working_hours_per_week)}
                </div>
            </div>
        </div>
        
        <div class="institute-card-actions">
            <button class="btn small secondary" onclick="showInstituteDetail('${institute.id}')">
                <i data-lucide="eye"></i> 상세보기
            </button>
            <button class="btn small primary" onclick="showEditInstituteModal('${institute.id}')">
                <i data-lucide="edit"></i> 편집
            </button>
            <button class="btn small danger" onclick="deleteInstitute('${institute.id}')">
                <i data-lucide="trash-2"></i> 삭제
            </button>
            <button class="btn small ${institute.is_active ? 'warning' : 'success'}" 
                    onclick="toggleInstituteStatus('${institute.id}')">
                <i data-lucide="${institute.is_active ? 'pause' : 'play'}"></i> 
                ${institute.is_active ? '비활성화' : '활성화'}
            </button>
        </div>
    `;
    
    return card;
}

/**
 * 학당 추가 모달 표시
 */
function showAddInstituteModal() {
    // 모달이 없으면 생성
    if (!Utils.$('#addInstituteModal')) {
        createInstituteModals();
    }
    
    // 폼 초기화
    const form = Utils.$('#addInstituteForm');
    if (form) {
        form.reset();
        // 기본값 설정
        Utils.$('#addWorkingHours').value = '주 25시간 / 40시간';
        Utils.$('#addCulturalHours').value = '12';
        Utils.$('#addMaxStudents').value = '15';
        Utils.$('#addIsActive').checked = true;
    }
    
    Utils.$('#addInstituteModal').classList.add('active');
    
    // 첫 번째 입력 필드에 포커스
    setTimeout(() => {
        const firstInput = Utils.$('#addNameKo');
        if (firstInput) firstInput.focus();
    }, 100);
}

/**
 * 학당 편집 모달 표시
 */
async function showEditInstituteModal(instituteId) {
    try {
        // 모달이 없으면 생성
        if (!Utils.$('#editInstituteModal')) {
            createInstituteModals();
        }
        
        const institute = currentInstitutes.find(inst => inst.id === instituteId);
        if (!institute) {
            Utils.showToast('학당 정보를 찾을 수 없습니다.', 'error');
            return;
        }
        
        currentEditingInstitute = institute;
        
        // 폼에 기존 데이터 채우기
        const form = Utils.$('#editInstituteForm');
        if (form) {
            Utils.$('#editNameKo').value = institute.name_ko || '';
            Utils.$('#editNameEn').value = institute.name_en || '';
            Utils.$('#editOperator').value = institute.operator || '';
            Utils.$('#editCountry').value = institute.country || '';
            Utils.$('#editCity').value = institute.city || '';
            Utils.$('#editAddress').value = institute.address || '';
            Utils.$('#editPhone').value = institute.phone || '';
            Utils.$('#editContactPerson').value = institute.contact_person || '';
            Utils.$('#editContactEmail').value = institute.contact_email || '';
            Utils.$('#editLocalCoordinator').value = institute.local_coordinator || '';
            Utils.$('#editLocalCoordinatorRole').value = institute.local_coordinator_role || '';
            Utils.$('#editSnsUrl').value = institute.sns_url || '';
            Utils.$('#editWorkingHours').value = institute.working_hours_per_week || '';
            Utils.$('#editCulturalHours').value = institute.cultural_class_hours || '';
            Utils.$('#editClassSchedule').value = institute.class_schedule || '';
            Utils.$('#editMaxStudents').value = institute.max_students_per_class || '';
            Utils.$('#editLanguageRequirement').value = institute.local_language_requirement || '';
            Utils.$('#editSupportProvided').value = institute.support_provided || '';
            Utils.$('#editIsActive').checked = institute.is_active !== false;
        }
        
        Utils.$('#editInstituteModal').classList.add('active');
        
        // 첫 번째 입력 필드에 포커스
        setTimeout(() => {
            const firstInput = Utils.$('#editNameKo');
            if (firstInput) firstInput.focus();
        }, 100);
        
    } catch (error) {
        console.error('학당 편집 모달 표시 오류:', error);
        Utils.showToast('학당 정보를 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 학당 상세 정보 모달 표시
 */
async function showInstituteDetail(instituteId) {
    try {
        // 모달이 없으면 생성
        if (!Utils.$('#instituteDetailModal')) {
            createInstituteModals();
        }
        
        const institute = currentInstitutes.find(inst => inst.id === instituteId);
        if (!institute) {
            Utils.showToast('학당 정보를 찾을 수 없습니다.', 'error');
            return;
        }
        
        // 상세 정보 채우기
        const modal = Utils.$('#instituteDetailModal');
        
        // 기본 정보
        modal.querySelector('#detailNameKo').textContent = institute.name_ko || '-';
        modal.querySelector('#detailNameEn').textContent = institute.name_en || '-';
        modal.querySelector('#detailOperator').textContent = institute.operator || '-';
        modal.querySelector('#detailLocation').textContent = `${institute.city || '-'}, ${institute.country || '-'}`;
        modal.querySelector('#detailAddress').textContent = institute.address || '-';
        modal.querySelector('#detailPhone').textContent = institute.phone || '-';
        
        // 담당자 정보
        modal.querySelector('#detailContactPerson').textContent = institute.contact_person || '-';
        modal.querySelector('#detailContactEmail').innerHTML = institute.contact_email ? 
            `<a href="mailto:${institute.contact_email}">${institute.contact_email}</a>` : '-';
        modal.querySelector('#detailLocalCoordinator').textContent = 
            institute.local_coordinator ? 
            `${institute.local_coordinator} (${institute.local_coordinator_role || '현지 담당자'})` : '-';
        
        // SNS 정보
        modal.querySelector('#detailSnsUrl').innerHTML = institute.sns_url ? 
            `<a href="${institute.sns_url}" target="_blank">${institute.sns_url}</a>` : '-';
        
        // 근무 정보
        modal.querySelector('#detailWorkingHours').textContent = institute.working_hours_per_week || '-';
        modal.querySelector('#detailCulturalHours').textContent = 
            institute.cultural_class_hours ? `주 ${institute.cultural_class_hours}시간` : '-';
        modal.querySelector('#detailClassSchedule').textContent = institute.class_schedule || '-';
        modal.querySelector('#detailMaxStudents').textContent = 
            institute.max_students_per_class ? `${institute.max_students_per_class}명` : '-';
        
        // 추가 정보
        modal.querySelector('#detailLanguageRequirement').textContent = institute.local_language_requirement || '-';
        modal.querySelector('#detailSupportProvided').textContent = institute.support_provided || '-';
        modal.querySelector('#detailStatus').textContent = institute.is_active ? '활성' : '비활성';
        
        // 문화 프로그램 목록
        const programsList = modal.querySelector('#detailProgramsList');
        const programs = institute.cultural_programs || [];
        
        if (programs.length === 0) {
            programsList.innerHTML = '<p class="no-programs">등록된 문화 프로그램이 없습니다.</p>';
        } else {
            programsList.innerHTML = programs.map(program => `
                <div class="program-item">
                    <h4>${Utils.escapeHtml(program.program_name)}</h4>
                    ${program.location ? `<p><strong>장소:</strong> ${Utils.escapeHtml(program.location)}</p>` : ''}
                    ${program.max_capacity ? `<p><strong>최대 수용:</strong> ${program.max_capacity}명</p>` : ''}
                    ${program.equipment_needed ? `<p><strong>필요 교구:</strong> ${Utils.escapeHtml(program.equipment_needed)}</p>` : ''}
                    ${program.description ? `<p><strong>설명:</strong> ${Utils.escapeHtml(program.description)}</p>` : ''}
                </div>
            `).join('');
        }
        
        modal.classList.add('active');
        
        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
    } catch (error) {
        console.error('학당 상세 정보 표시 오류:', error);
        Utils.showToast('학당 상세 정보를 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 모달 숨김
 */
function hideInstituteModal(type) {
    const modals = {
        'add': '#addInstituteModal',
        'edit': '#editInstituteModal',
        'detail': '#instituteDetailModal'
    };
    
    const modal = Utils.$(modals[type]);
    if (modal) {
        modal.classList.remove('active');
        
        // 편집 모달의 경우 현재 편집 중인 학당 정보 초기화
        if (type === 'edit') {
            currentEditingInstitute = null;
        }
    }
}

/**
 * 학당 추가 처리
 */
async function handleAddInstitute() {
    try {
        const form = Utils.$('#addInstituteForm');
        const formData = new FormData(form);
        
        // 폼 데이터 검증
        const requiredFields = ['name_ko', 'name_en', 'operator', 'country', 'city', 'address'];
        for (const field of requiredFields) {
            if (!formData.get(field)?.trim()) {
                Utils.showToast(`${getFieldLabel(field)}을(를) 입력해주세요.`, 'warning');
                return;
            }
        }
        
        const submitBtn = form.querySelector('button[type="submit"]');
        Utils.showLoading(submitBtn);
        
        // 학당 데이터 준비
        const instituteData = {
            name_ko: formData.get('name_ko').trim(),
            name_en: formData.get('name_en').trim(),
            operator: formData.get('operator').trim(),
            country: formData.get('country').trim(),
            city: formData.get('city').trim(),
            address: formData.get('address').trim(),
            phone: formData.get('phone')?.trim() || null,
            contact_person: formData.get('contact_person')?.trim() || null,
            contact_email: formData.get('contact_email')?.trim() || null,
            local_coordinator: formData.get('local_coordinator')?.trim() || null,
            local_coordinator_role: formData.get('local_coordinator_role')?.trim() || null,
            sns_url: formData.get('sns_url')?.trim() || null,
            working_hours_per_week: formData.get('working_hours_per_week')?.trim() || null,
            cultural_class_hours: formData.get('cultural_class_hours') ? 
                parseInt(formData.get('cultural_class_hours')) : null,
            class_schedule: formData.get('class_schedule')?.trim() || null,
            max_students_per_class: formData.get('max_students_per_class') ? 
                parseInt(formData.get('max_students_per_class')) : null,
            local_language_requirement: formData.get('local_language_requirement')?.trim() || null,
            support_provided: formData.get('support_provided')?.trim() || null,
            is_active: formData.get('is_active') === 'on'
        };
        
        // Supabase에 저장
        const { data, error } = await supabase
            .from('institutes')
            .insert([instituteData])
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        Utils.hideLoading(submitBtn);
        hideInstituteModal('add');
        
        Utils.showToast('새 학당이 추가되었습니다.', 'success');
        
        // 목록 새로고침
        await loadInstitutesList();
        
    } catch (error) {
        const submitBtn = Utils.$('#addInstituteForm button[type="submit"]');
        if (submitBtn) Utils.hideLoading(submitBtn);
        
        console.error('학당 추가 오류:', error);
        Utils.showToast('학당 추가 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 학당 편집 처리
 */
async function handleEditInstitute() {
    try {
        if (!currentEditingInstitute) {
            Utils.showToast('편집할 학당 정보를 찾을 수 없습니다.', 'error');
            return;
        }
        
        const form = Utils.$('#editInstituteForm');
        const formData = new FormData(form);
        
        // 폼 데이터 검증
        const requiredFields = ['name_ko', 'name_en', 'operator', 'country', 'city', 'address'];
        for (const field of requiredFields) {
            if (!formData.get(field)?.trim()) {
                Utils.showToast(`${getFieldLabel(field)}을(를) 입력해주세요.`, 'warning');
                return;
            }
        }
        
        const submitBtn = form.querySelector('button[type="submit"]');
        Utils.showLoading(submitBtn);
        
        // 업데이트할 데이터 준비
        const updateData = {
            name_ko: formData.get('name_ko').trim(),
            name_en: formData.get('name_en').trim(),
            operator: formData.get('operator').trim(),
            country: formData.get('country').trim(),
            city: formData.get('city').trim(),
            address: formData.get('address').trim(),
            phone: formData.get('phone')?.trim() || null,
            contact_person: formData.get('contact_person')?.trim() || null,
            contact_email: formData.get('contact_email')?.trim() || null,
            local_coordinator: formData.get('local_coordinator')?.trim() || null,
            local_coordinator_role: formData.get('local_coordinator_role')?.trim() || null,
            sns_url: formData.get('sns_url')?.trim() || null,
            working_hours_per_week: formData.get('working_hours_per_week')?.trim() || null,
            cultural_class_hours: formData.get('cultural_class_hours') ? 
                parseInt(formData.get('cultural_class_hours')) : null,
            class_schedule: formData.get('class_schedule')?.trim() || null,
            max_students_per_class: formData.get('max_students_per_class') ? 
                parseInt(formData.get('max_students_per_class')) : null,
            local_language_requirement: formData.get('local_language_requirement')?.trim() || null,
            support_provided: formData.get('support_provided')?.trim() || null,
            is_active: formData.get('is_active') === 'on'
        };
        
        // Supabase에서 업데이트
        const { data, error } = await supabase
            .from('institutes')
            .update(updateData)
            .eq('id', currentEditingInstitute.id)
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        Utils.hideLoading(submitBtn);
        hideInstituteModal('edit');
        
        Utils.showToast('학당 정보가 수정되었습니다.', 'success');
        
        // 목록 새로고침
        await loadInstitutesList();
        
    } catch (error) {
        const submitBtn = Utils.$('#editInstituteForm button[type="submit"]');
        if (submitBtn) Utils.hideLoading(submitBtn);
        
        console.error('학당 편집 오류:', error);
        Utils.showToast('학당 편집 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 학당 삭제
 */
async function deleteInstitute(instituteId) {
    try {
        const institute = currentInstitutes.find(inst => inst.id === instituteId);
        if (!institute) {
            Utils.showToast('학당 정보를 찾을 수 없습니다.', 'error');
            return;
        }
        
        const confirmed = Utils.showConfirm(
            `'${institute.name_ko}' 학당을 삭제하시겠습니까?\\n\\n` +
            `⚠️ 주의: 이 작업은 되돌릴 수 없으며, 관련된 모든 문화 프로그램도 함께 삭제됩니다.`
        );
        
        if (!confirmed) return;
        
        // Supabase에서 삭제 (CASCADE로 관련 프로그램도 자동 삭제됨)
        const { error } = await supabase
            .from('institutes')
            .delete()
            .eq('id', instituteId);
        
        if (error) {
            throw error;
        }
        
        Utils.showToast('학당이 삭제되었습니다.', 'success');
        
        // 목록 새로고침
        await loadInstitutesList();
        
    } catch (error) {
        console.error('학당 삭제 오류:', error);
        Utils.showToast('학당 삭제 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 학당 활성/비활성 상태 토글
 */
async function toggleInstituteStatus(instituteId) {
    try {
        const institute = currentInstitutes.find(inst => inst.id === instituteId);
        if (!institute) {
            Utils.showToast('학당 정보를 찾을 수 없습니다.', 'error');
            return;
        }
        
        const newStatus = !institute.is_active;
        const actionText = newStatus ? '활성화' : '비활성화';
        
        const confirmed = Utils.showConfirm(
            `'${institute.name_ko}' 학당을 ${actionText}하시겠습니까?`
        );
        
        if (!confirmed) return;
        
        // Supabase에서 상태 업데이트
        const { error } = await supabase
            .from('institutes')
            .update({ is_active: newStatus })
            .eq('id', instituteId);
        
        if (error) {
            throw error;
        }
        
        Utils.showToast(`학당이 ${actionText}되었습니다.`, 'success');
        
        // 목록 새로고침
        await loadInstitutesList();
        
    } catch (error) {
        console.error('학당 상태 변경 오류:', error);
        Utils.showToast('학당 상태 변경 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 필드 레이블 반환
 */
function getFieldLabel(fieldName) {
    const labels = {
        'name_ko': '한국어 학당명',
        'name_en': '영어 학당명',
        'operator': '운영기관',
        'country': '국가',
        'city': '도시',
        'address': '주소'
    };
    return labels[fieldName] || fieldName;
}

/**
 * 학당 관리 모달 HTML 생성
 */
function createInstituteModals() {
    // 모달이 이미 존재하면 생성하지 않음
    if (Utils.$('#addInstituteModal')) return;
    
    const modalsHTML = `
        <!-- 학당 추가 모달 -->
        <div id="addInstituteModal" class="modal">
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>새 학당 추가</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <form id="addInstituteForm">
                    <div class="modal-body">
                        <div class="form-section">
                            <h4>기본 정보</h4>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="addNameKo">한국어 학당명 *</label>
                                    <input type="text" id="addNameKo" name="name_ko" required>
                                </div>
                                <div class="form-group">
                                    <label for="addNameEn">영어 학당명 *</label>
                                    <input type="text" id="addNameEn" name="name_en" required>
                                </div>
                                <div class="form-group">
                                    <label for="addOperator">운영기관 *</label>
                                    <input type="text" id="addOperator" name="operator" required>
                                </div>
                                <div class="form-group">
                                    <label for="addCountry">국가 *</label>
                                    <input type="text" id="addCountry" name="country" required>
                                </div>
                                <div class="form-group">
                                    <label for="addCity">도시 *</label>
                                    <input type="text" id="addCity" name="city" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="addAddress">주소 *</label>
                                <textarea id="addAddress" name="address" rows="3" required></textarea>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4>연락처 정보</h4>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="addPhone">전화번호</label>
                                    <input type="tel" id="addPhone" name="phone">
                                </div>
                                <div class="form-group">
                                    <label for="addContactPerson">담당자</label>
                                    <input type="text" id="addContactPerson" name="contact_person">
                                </div>
                                <div class="form-group">
                                    <label for="addContactEmail">담당자 이메일</label>
                                    <input type="email" id="addContactEmail" name="contact_email">
                                </div>
                                <div class="form-group">
                                    <label for="addLocalCoordinator">현지 담당자</label>
                                    <input type="text" id="addLocalCoordinator" name="local_coordinator">
                                </div>
                                <div class="form-group">
                                    <label for="addLocalCoordinatorRole">현지 담당자 역할</label>
                                    <input type="text" id="addLocalCoordinatorRole" name="local_coordinator_role" 
                                           placeholder="예: 현지 운영요원">
                                </div>
                                <div class="form-group">
                                    <label for="addSnsUrl">SNS URL</label>
                                    <input type="url" id="addSnsUrl" name="sns_url" 
                                           placeholder="https://www.instagram.com/example">
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4>근무 및 수업 정보</h4>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="addWorkingHours">근무 시간</label>
                                    <input type="text" id="addWorkingHours" name="working_hours_per_week" 
                                           placeholder="예: 주 25시간 / 40시간">
                                </div>
                                <div class="form-group">
                                    <label for="addCulturalHours">문화강좌 시간</label>
                                    <input type="number" id="addCulturalHours" name="cultural_class_hours" 
                                           min="0" placeholder="주당 시간">
                                </div>
                                <div class="form-group">
                                    <label for="addMaxStudents">반당 최대 인원</label>
                                    <input type="number" id="addMaxStudents" name="max_students_per_class" 
                                           min="1" placeholder="명">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="addClassSchedule">수업 일정</label>
                                <input type="text" id="addClassSchedule" name="class_schedule" 
                                       placeholder="예: 월수 / 화목 수업 (주 4회-4개 반), 1회 3시간씩 운영">
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4>추가 정보</h4>
                            <div class="form-group">
                                <label for="addLanguageRequirement">현지어 요구 수준</label>
                                <textarea id="addLanguageRequirement" name="local_language_requirement" rows="2"
                                          placeholder="예: 현지 생활, 학습자와 간단한 소통을 위한 현지어 가능자 (초급 이상)"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="addSupportProvided">학당 지원 사항</label>
                                <textarea id="addSupportProvided" name="support_provided" rows="2"
                                          placeholder="예: 학당 근무 시 개인 책상 및 컴퓨터 제공"></textarea>
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="addIsActive" name="is_active" checked>
                                    <span class="checkmark"></span>
                                    활성 상태
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn secondary cancel-btn">취소</button>
                        <button type="submit" class="btn primary">
                            <i data-lucide="plus"></i>
                            학당 추가
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- 학당 편집 모달 -->
        <div id="editInstituteModal" class="modal">
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>학당 정보 편집</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <form id="editInstituteForm">
                    <div class="modal-body">
                        <div class="form-section">
                            <h4>기본 정보</h4>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="editNameKo">한국어 학당명 *</label>
                                    <input type="text" id="editNameKo" name="name_ko" required>
                                </div>
                                <div class="form-group">
                                    <label for="editNameEn">영어 학당명 *</label>
                                    <input type="text" id="editNameEn" name="name_en" required>
                                </div>
                                <div class="form-group">
                                    <label for="editOperator">운영기관 *</label>
                                    <input type="text" id="editOperator" name="operator" required>
                                </div>
                                <div class="form-group">
                                    <label for="editCountry">국가 *</label>
                                    <input type="text" id="editCountry" name="country" required>
                                </div>
                                <div class="form-group">
                                    <label for="editCity">도시 *</label>
                                    <input type="text" id="editCity" name="city" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="editAddress">주소 *</label>
                                <textarea id="editAddress" name="address" rows="3" required></textarea>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4>연락처 정보</h4>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="editPhone">전화번호</label>
                                    <input type="tel" id="editPhone" name="phone">
                                </div>
                                <div class="form-group">
                                    <label for="editContactPerson">담당자</label>
                                    <input type="text" id="editContactPerson" name="contact_person">
                                </div>
                                <div class="form-group">
                                    <label for="editContactEmail">담당자 이메일</label>
                                    <input type="email" id="editContactEmail" name="contact_email">
                                </div>
                                <div class="form-group">
                                    <label for="editLocalCoordinator">현지 담당자</label>
                                    <input type="text" id="editLocalCoordinator" name="local_coordinator">
                                </div>
                                <div class="form-group">
                                    <label for="editLocalCoordinatorRole">현지 담당자 역할</label>
                                    <input type="text" id="editLocalCoordinatorRole" name="local_coordinator_role">
                                </div>
                                <div class="form-group">
                                    <label for="editSnsUrl">SNS URL</label>
                                    <input type="url" id="editSnsUrl" name="sns_url">
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4>근무 및 수업 정보</h4>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="editWorkingHours">근무 시간</label>
                                    <input type="text" id="editWorkingHours" name="working_hours_per_week">
                                </div>
                                <div class="form-group">
                                    <label for="editCulturalHours">문화강좌 시간</label>
                                    <input type="number" id="editCulturalHours" name="cultural_class_hours" min="0">
                                </div>
                                <div class="form-group">
                                    <label for="editMaxStudents">반당 최대 인원</label>
                                    <input type="number" id="editMaxStudents" name="max_students_per_class" min="1">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="editClassSchedule">수업 일정</label>
                                <input type="text" id="editClassSchedule" name="class_schedule">
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4>추가 정보</h4>
                            <div class="form-group">
                                <label for="editLanguageRequirement">현지어 요구 수준</label>
                                <textarea id="editLanguageRequirement" name="local_language_requirement" rows="2"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="editSupportProvided">학당 지원 사항</label>
                                <textarea id="editSupportProvided" name="support_provided" rows="2"></textarea>
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="editIsActive" name="is_active">
                                    <span class="checkmark"></span>
                                    활성 상태
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn secondary cancel-btn">취소</button>
                        <button type="submit" class="btn primary">
                            <i data-lucide="save"></i>
                            변경사항 저장
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- 학당 상세 정보 모달 -->
        <div id="instituteDetailModal" class="modal">
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>학당 상세 정보</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="detail-section">
                        <h4>기본 정보</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>한국어 학당명:</label>
                                <span id="detailNameKo">-</span>
                            </div>
                            <div class="detail-item">
                                <label>영어 학당명:</label>
                                <span id="detailNameEn">-</span>
                            </div>
                            <div class="detail-item">
                                <label>운영기관:</label>
                                <span id="detailOperator">-</span>
                            </div>
                            <div class="detail-item">
                                <label>위치:</label>
                                <span id="detailLocation">-</span>
                            </div>
                        </div>
                        <div class="detail-item full-width">
                            <label>주소:</label>
                            <span id="detailAddress">-</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>연락처 정보</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>전화번호:</label>
                                <span id="detailPhone">-</span>
                            </div>
                            <div class="detail-item">
                                <label>담당자:</label>
                                <span id="detailContactPerson">-</span>
                            </div>
                            <div class="detail-item">
                                <label>담당자 이메일:</label>
                                <span id="detailContactEmail">-</span>
                            </div>
                            <div class="detail-item">
                                <label>현지 담당자:</label>
                                <span id="detailLocalCoordinator">-</span>
                            </div>
                            <div class="detail-item">
                                <label>SNS:</label>
                                <span id="detailSnsUrl">-</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>근무 및 수업 정보</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>근무 시간:</label>
                                <span id="detailWorkingHours">-</span>
                            </div>
                            <div class="detail-item">
                                <label>문화강좌 시간:</label>
                                <span id="detailCulturalHours">-</span>
                            </div>
                            <div class="detail-item">
                                <label>반당 최대 인원:</label>
                                <span id="detailMaxStudents">-</span>
                            </div>
                            <div class="detail-item">
                                <label>상태:</label>
                                <span id="detailStatus">-</span>
                            </div>
                        </div>
                        <div class="detail-item full-width">
                            <label>수업 일정:</label>
                            <span id="detailClassSchedule">-</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>추가 정보</h4>
                        <div class="detail-item full-width">
                            <label>현지어 요구 수준:</label>
                            <span id="detailLanguageRequirement">-</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>학당 지원 사항:</label>
                            <span id="detailSupportProvided">-</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>문화 프로그램</h4>
                        <div id="detailProgramsList" class="programs-list">
                            <!-- 프로그램 목록이 여기에 표시됩니다 -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // body에 모달 HTML 추가
    document.body.insertAdjacentHTML('beforeend', modalsHTML);
}

// 관리자 대시보드 초기화 시 학당 관리 기능도 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 관리자 페이지에서만 실행
    if (document.getElementById('adminPage')) {
        // 관리자 탭 전환 시 학당 관리 초기화
        const instituteTab = document.getElementById('instituteTab');
        if (instituteTab) {
            instituteTab.addEventListener('click', function() {
                // 탭이 활성화된 후 학당 관리 초기화
                setTimeout(() => {
                    if (document.getElementById('instituteManagement').classList.contains('active')) {
                        initializeInstituteManagement();
                    }
                }, 100);
            });
        }
    }
});