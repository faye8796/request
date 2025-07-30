/**
 * 관리자용 비자 발급 관리 시스템 - 메인 모듈
 * Version: 1.0.0
 * Description: 학생 비자 발급 현황 모니터링, 관리자 코멘트 관리, 서류 및 영수증 확인
 */

import { CONFIG } from '../config.js';

class VisaManagementSystem {
    constructor() {
        this.currentUser = null;
        this.students = [];
        this.visaData = new Map();
        this.receiptsCount = new Map();
        this.filteredStudents = [];
        this.commentSaveTimeouts = new Map();
        
        this.initialize();
    }

    async initialize() {
        console.log('🛂 관리자용 비자 발급 관리 시스템 초기화 시작');
        
        try {
            // 관리자 인증 확인
            await this.checkAdminAuth();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 데이터 로드
            await this.loadData();
            
            console.log('✅ 비자 관리 시스템 초기화 완료');
        } catch (error) {
            console.error('❌ 비자 관리 시스템 초기화 실패:', error);
            this.showError('시스템 초기화에 실패했습니다.');
        }
    }

    async checkAdminAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            window.location.href = '../index.html';
            return;
        }

        try {
            this.currentUser = JSON.parse(currentUser);
            if (this.currentUser.role !== 'admin') {
                alert('관리자 권한이 필요합니다.');
                window.location.href = '../index.html';
                return;
            }
        } catch (error) {
            console.error('사용자 정보 파싱 오류:', error);
            localStorage.removeItem('currentUser');
            window.location.href = '../index.html';
        }
    }

    setupEventListeners() {
        // 검색 입력
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // 상태 필터
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.handleFilter(e.target.value);
            });
        }

        // 정렬 선택
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.handleSort(e.target.value);
            });
        }
    }

    async loadData() {
        try {
            this.showLoading();
            
            // 전체 학생 목록 조회
            await this.loadStudents();
            
            // 각 학생의 비자 정보 조회
            await this.loadVisaData();
            
            // 각 학생의 영수증 개수 조회
            await this.loadReceiptsCount();
            
            // 통계 계산 및 UI 렌더링
            this.calculateStatistics();
            this.renderStudentsList();
            
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            this.showError('데이터를 불러오는데 실패했습니다.');
        }
    }

    async loadStudents() {
        const { data, error } = await CONFIG.supabase
            .from('user_profiles')
            .select('id, name, email, institute_name, created_at')
            .eq('role', 'student')
            .order('name');

        if (error) {
            throw new Error(`학생 목록 조회 실패: ${error.message}`);
        }

        this.students = data || [];
        console.log(`📊 학생 ${this.students.length}명 로드 완료`);
    }

    async loadVisaData() {
        if (this.students.length === 0) return;

        const studentIds = this.students.map(s => s.id);
        
        const { data, error } = await CONFIG.supabase
            .from('visa_applications')
            .select('*')
            .in('user_id', studentIds);

        if (error) {
            console.error('비자 데이터 조회 오류:', error);
            return;
        }

        // Map으로 변환하여 빠른 조회 가능하도록
        this.visaData.clear();
        (data || []).forEach(visa => {
            this.visaData.set(visa.user_id, visa);
        });

        console.log(`📋 비자 데이터 ${data?.length || 0}개 로드 완료`);
    }

    async loadReceiptsCount() {
        if (this.students.length === 0) return;

        const studentIds = this.students.map(s => s.id);
        
        const { data, error } = await CONFIG.supabase
            .from('visa_receipts')
            .select('user_id')
            .in('user_id', studentIds);

        if (error) {
            console.error('영수증 개수 조회 오류:', error);
            return;
        }

        // 사용자별 영수증 개수 계산
        this.receiptsCount.clear();
        (data || []).forEach(receipt => {
            const currentCount = this.receiptsCount.get(receipt.user_id) || 0;
            this.receiptsCount.set(receipt.user_id, currentCount + 1);
        });

        console.log(`🧾 영수증 데이터 ${data?.length || 0}개 로드 완료`);
    }

    calculateStatistics() {
        const stats = {
            total: this.students.length,
            inProgress: 0,
            completed: 0,
            noStatus: 0
        };

        this.students.forEach(student => {
            const visa = this.visaData.get(student.id);
            
            if (!visa || !visa.visa_status || visa.visa_status.trim() === '') {
                stats.noStatus++;
            } else if (visa.visa_document_url) {
                stats.completed++;
            } else {
                stats.inProgress++;
            }
        });

        // UI 업데이트
        document.getElementById('total-count').textContent = stats.total;
        document.getElementById('in-progress-count').textContent = stats.inProgress;
        document.getElementById('completed-count').textContent = stats.completed;
        document.getElementById('no-status-count').textContent = stats.noStatus;

        console.log('📊 통계 계산 완료:', stats);
    }

    renderStudentsList() {
        const container = document.getElementById('students-list');
        if (!container) return;

        // 필터링된 학생 목록이 없으면 전체 학생 목록 사용
        const studentsToRender = this.filteredStudents.length > 0 ? this.filteredStudents : this.students;

        if (studentsToRender.length === 0) {
            container.innerHTML = `
                <div class="no-students">
                    <i data-lucide="user-x"></i>
                    <p>표시할 학생이 없습니다.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        container.innerHTML = studentsToRender.map(student => this.createStudentCard(student)).join('');
        
        // 이벤트 리스너 바인딩
        this.bindStudentCardEvents();
        
        // 아이콘 초기화
        lucide.createIcons();
    }

    createStudentCard(student) {
        const visa = this.visaData.get(student.id);
        const receiptsCount = this.receiptsCount.get(student.id) || 0;
        
        // 상태 결정
        let status = 'no-status';
        let statusText = '상태 없음';
        let statusIcon = 'alert-circle';
        
        if (visa && visa.visa_status && visa.visa_status.trim() !== '') {
            if (visa.visa_document_url) {
                status = 'completed';
                statusText = '완료';
                statusIcon = 'check-circle';
            } else {
                status = 'in-progress';
                statusText = '진행 중';
                statusIcon = 'clock';
            }
        }

        const hasVisaDocument = visa?.visa_document_url;
        const visaStatus = visa?.visa_status || '';
        const adminComment = visa?.admin_comment || '';
        const statusUpdated = visa?.visa_status_updated_at;
        const commentUpdated = visa?.admin_comment_updated_at;

        return `
            <div class="student-visa-card" data-student-id="${student.id}">
                <div class="student-header">
                    <div class="student-info">
                        <div class="student-name">
                            <i data-lucide="user"></i>
                            ${student.name}
                        </div>
                        <div class="student-email">${student.email}</div>
                        <div class="student-institute">${student.institute_name || '학당 미지정'}</div>
                    </div>
                    <div class="student-meta">
                        <div class="status-badge ${status}">
                            <i data-lucide="${statusIcon}"></i>
                            ${statusText}
                        </div>
                        <div class="receipts-count">영수증 ${receiptsCount}개</div>
                    </div>
                </div>

                <div class="visa-status-section">
                    <h4>
                        <i data-lucide="file-text"></i>
                        비자 발급 현황 (학생 입력)
                    </h4>
                    <div class="status-content ${visaStatus ? '' : 'empty'}">
                        ${visaStatus || '아직 비자 발급 현황이 입력되지 않았습니다.'}
                    </div>
                    ${statusUpdated ? `<div class="status-updated">마지막 업데이트: ${this.formatDateTime(statusUpdated)}</div>` : ''}
                </div>

                <div class="admin-comment-section">
                    <h4>
                        <i data-lucide="message-square"></i>
                        관리자 코멘트
                    </h4>
                    <textarea class="admin-comment-input" 
                              placeholder="관리자 코멘트를 입력하세요..."
                              data-student-id="${student.id}">${adminComment}</textarea>
                    <button class="save-comment-btn" data-student-id="${student.id}">
                        <i data-lucide="save"></i>
                        저장
                    </button>
                    <span class="save-indicator" data-student-id="${student.id}">저장됨</span>
                    ${commentUpdated ? `<div class="status-updated">마지막 업데이트: ${this.formatDateTime(commentUpdated)}</div>` : ''}
                </div>

                <div class="action-buttons">
                    <button class="action-btn view-visa-btn" 
                            data-student-id="${student.id}"
                            ${hasVisaDocument ? '' : 'disabled'}>
                        <i data-lucide="eye"></i>
                        비자보기
                    </button>
                    <button class="action-btn view-receipts-btn" 
                            data-student-id="${student.id}">
                        <i data-lucide="receipt"></i>
                        영수증보기 (${receiptsCount})
                    </button>
                </div>
            </div>
        `;
    }

    bindStudentCardEvents() {
        // 관리자 코멘트 입력 이벤트
        document.querySelectorAll('.admin-comment-input').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const studentId = e.target.dataset.studentId;
                this.handleCommentInput(studentId, e.target.value);
            });
        });

        // 저장 버튼 이벤트
        document.querySelectorAll('.save-comment-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.target.dataset.studentId;
                this.saveCommentNow(studentId);
            });
        });

        // 비자 보기 버튼 이벤트
        document.querySelectorAll('.view-visa-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.target.dataset.studentId;
                this.viewVisaDocument(studentId);
            });
        });

        // 영수증 보기 버튼 이벤트
        document.querySelectorAll('.view-receipts-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.target.dataset.studentId;
                this.viewReceipts(studentId);
            });
        });
    }

    handleCommentInput(studentId, comment) {
        // 기존 타이머 클리어
        if (this.commentSaveTimeouts.has(studentId)) {
            clearTimeout(this.commentSaveTimeouts.get(studentId));
        }

        // 1초 후 자동 저장
        const timeout = setTimeout(() => {
            this.saveComment(studentId, comment);
        }, 1000);

        this.commentSaveTimeouts.set(studentId, timeout);
    }

    async saveComment(studentId, comment) {
        try {
            const { error } = await CONFIG.supabase
                .from('visa_applications')
                .upsert({
                    user_id: studentId,
                    admin_comment: comment,
                    admin_comment_updated_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) {
                throw error;
            }

            // 저장 완료 표시
            this.showSaveIndicator(studentId);
            
            // 데이터 업데이트
            const existingVisa = this.visaData.get(studentId) || {};
            this.visaData.set(studentId, {
                ...existingVisa,
                user_id: studentId,
                admin_comment: comment,
                admin_comment_updated_at: new Date().toISOString()
            });

            console.log(`💬 관리자 코멘트 저장 완료: ${studentId}`);
        } catch (error) {
            console.error('코멘트 저장 오류:', error);
            this.showError('코멘트 저장에 실패했습니다.');
        }
    }

    async saveCommentNow(studentId) {
        const textarea = document.querySelector(`.admin-comment-input[data-student-id="${studentId}"]`);
        if (!textarea) return;

        const comment = textarea.value;
        
        // 기존 타이머 클리어
        if (this.commentSaveTimeouts.has(studentId)) {
            clearTimeout(this.commentSaveTimeouts.get(studentId));
            this.commentSaveTimeouts.delete(studentId);
        }

        await this.saveComment(studentId, comment);
    }

    showSaveIndicator(studentId) {
        const indicator = document.querySelector(`.save-indicator[data-student-id="${studentId}"]`);
        if (indicator) {
            indicator.classList.add('show');
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 2000);
        }
    }

    viewVisaDocument(studentId) {
        const visa = this.visaData.get(studentId);
        if (!visa || !visa.visa_document_url) {
            alert('업로드된 비자 문서가 없습니다.');
            return;
        }

        // 새 창에서 문서 열기
        window.open(visa.visa_document_url, '_blank');
    }

    viewReceipts(studentId) {
        // 영수증 모달 열기 (Phase 4에서 구현)
        console.log(`🧾 영수증 보기 요청: ${studentId}`);
        alert('영수증 보기 기능은 곧 구현될 예정입니다.');
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.filteredStudents = [];
            this.renderStudentsList();
            return;
        }

        const searchTerm = query.toLowerCase();
        this.filteredStudents = this.students.filter(student => {
            return student.name.toLowerCase().includes(searchTerm) ||
                   student.email.toLowerCase().includes(searchTerm);
        });

        this.renderStudentsList();
    }

    handleFilter(filterValue) {
        if (filterValue === 'all') {
            this.filteredStudents = [];
        } else {
            this.filteredStudents = this.students.filter(student => {
                const visa = this.visaData.get(student.id);
                
                switch (filterValue) {
                    case 'completed':
                        return visa?.visa_document_url;
                    case 'in-progress':
                        return visa?.visa_status && visa.visa_status.trim() !== '' && !visa.visa_document_url;
                    case 'no-status':
                        return !visa?.visa_status || visa.visa_status.trim() === '';
                    default:
                        return true;
                }
            });
        }

        this.renderStudentsList();
    }

    handleSort(sortType) {
        const studentsToSort = this.filteredStudents.length > 0 ? this.filteredStudents : this.students;
        
        studentsToSort.sort((a, b) => {
            switch (sortType) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'updated':
                    const visaA = this.visaData.get(a.id);
                    const visaB = this.visaData.get(b.id);
                    const timeA = visaA?.visa_status_updated_at || visaA?.created_at || '1970-01-01';
                    const timeB = visaB?.visa_status_updated_at || visaB?.created_at || '1970-01-01';
                    return new Date(timeB) - new Date(timeA);
                case 'status':
                    const getStatusPriority = (student) => {
                        const visa = this.visaData.get(student.id);
                        if (!visa?.visa_status || visa.visa_status.trim() === '') return 3; // no-status
                        if (visa.visa_document_url) return 1; // completed
                        return 2; // in-progress
                    };
                    return getStatusPriority(a) - getStatusPriority(b);
                default:
                    return 0;
            }
        });

        this.renderStudentsList();
    }

    formatDateTime(dateTimeString) {
        if (!dateTimeString) return '';
        
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateTimeString;
        }
    }

    showLoading() {
        const container = document.getElementById('students-list');
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    데이터를 불러오는 중...
                </div>
            `;
        }
    }

    showError(message) {
        const container = document.getElementById('students-list');
        if (container) {
            container.innerHTML = `
                <div class="no-students">
                    <i data-lucide="alert-triangle"></i>
                    <p>${message}</p>
                </div>
            `;
            lucide.createIcons();
        }
    }
}

// 페이지 로드 시 시스템 초기화
document.addEventListener('DOMContentLoaded', () => {
    new VisaManagementSystem();
});

// 모듈 내보내기
export { VisaManagementSystem };