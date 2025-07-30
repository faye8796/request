/**
 * 관리자용 비자 발급 관리 시스템 - 메인 모듈 (업데이트)
 * Version: 1.1.0
 * Description: UI 모듈과 모달 시스템 통합 버전
 */

import { CONFIG } from '../config.js';
import { VisaManagementAPI } from './visa-management-api.js';
import { VisaManagementUI } from './visa-management-ui.js';
import { VisaManagementModals } from './visa-management-modals.js';

class VisaManagementSystem {
    constructor() {
        this.currentUser = null;
        this.students = [];
        this.visaData = new Map();
        this.receiptsCount = new Map();
        this.filteredStudents = [];
        this.commentSaveTimeouts = new Map();
        
        // 모듈 초기화
        this.api = new VisaManagementAPI();
        this.ui = new VisaManagementUI();
        this.modals = new VisaManagementModals();
        
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
            this.ui.showError('students-list', '시스템 초기화에 실패했습니다.');
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
            searchInput.addEventListener('input', this.ui.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
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

        // 키보드 단축키
        document.addEventListener('keydown', (e) => {
            // Ctrl + F: 검색 포커스
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                searchInput?.focus();
            }
            // ESC: 모든 모달 닫기
            if (e.key === 'Escape') {
                this.modals.closeAllModals();
            }
        });
    }

    async loadData() {
        try {
            this.ui.showLoading('students-list');
            
            // 전체 학생 목록 조회
            this.students = await this.api.getStudents();
            
            if (this.students.length === 0) {
                this.ui.showEmpty('students-list', '등록된 학생이 없습니다.');
                this.updateStatistics();
                return;
            }
            
            // 각 학생의 비자 정보 조회
            await this.loadVisaData();
            
            // 각 학생의 영수증 개수 조회
            await this.loadReceiptsCount();
            
            // 통계 계산 및 UI 렌더링
            this.updateStatistics();
            this.renderStudentsList();
            
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            this.ui.showError('students-list', '데이터를 불러오는데 실패했습니다.');
        }
    }

    async loadVisaData() {
        if (this.students.length === 0) return;

        const visaApplications = await this.api.getVisaApplications(this.students.map(s => s.id));
        
        // Map으로 변환하여 빠른 조회 가능하도록
        this.visaData.clear();
        visaApplications.forEach(visa => {
            this.visaData.set(visa.user_id, visa);
        });

        console.log(`📋 비자 데이터 ${visaApplications.length}개 로드 완료`);
    }

    async loadReceiptsCount() {
        if (this.students.length === 0) return;

        const receiptsCountMap = await this.api.getReceiptsCount(this.students.map(s => s.id));
        
        // Map으로 변환
        this.receiptsCount.clear();
        Object.entries(receiptsCountMap).forEach(([userId, count]) => {
            this.receiptsCount.set(userId, count);
        });

        console.log(`🧾 영수증 데이터 로드 완료`);
    }

    updateStatistics() {
        const stats = {
            total: this.students.length,
            inProgress: 0,
            completed: 0,
            noStatus: 0
        };

        this.students.forEach(student => {
            const visa = this.visaData.get(student.id);
            const status = this.ui.determineStudentStatus(visa || {});
            
            if (status === 'no-status') {
                stats.noStatus++;
            } else if (status === 'completed') {
                stats.completed++;
            } else if (status === 'in-progress') {
                stats.inProgress++;
            }
        });

        // UI 업데이트
        this.ui.updateStatistics(stats);
        console.log('📊 통계 계산 완료:', stats);
    }

    renderStudentsList() {
        const container = document.getElementById('students-list');
        if (!container) return;

        // 필터링된 학생 목록이 없으면 전체 학생 목록 사용
        const studentsToRender = this.filteredStudents.length > 0 ? this.filteredStudents : this.students;

        if (studentsToRender.length === 0) {
            this.ui.showEmpty(container, '표시할 학생이 없습니다.');
            return;
        }

        // 학생 카드들 생성
        const cardsHtml = studentsToRender.map(student => {
            const visaData = this.visaData.get(student.id);
            const receiptsCount = this.receiptsCount.get(student.id) || 0;
            return this.ui.createStudentCard(student, visaData, receiptsCount);
        }).join('');

        container.innerHTML = cardsHtml;
        
        // 이벤트 리스너 바인딩
        this.bindStudentCardEvents();
        
        // 아이콘 초기화
        lucide.createIcons();

        // 페이드 인 애니메이션
        this.ui.fadeIn(container);
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
                const student = this.students.find(s => s.id === studentId);
                if (student && !button.disabled) {
                    this.modals.showVisaDocumentViewer(studentId, student.name);
                }
            });
        });

        // 영수증 보기 버튼 이벤트
        document.querySelectorAll('.view-receipts-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.target.dataset.studentId;
                const student = this.students.find(s => s.id === studentId);
                if (student) {
                    this.modals.showReceiptsModal(studentId, student.name);
                }
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
            const result = await this.api.saveAdminComment(studentId, comment);
            
            // 저장 완료 표시
            this.ui.showSaveIndicator(studentId);
            
            // 데이터 업데이트
            this.visaData.set(studentId, result);

            console.log(`💬 관리자 코멘트 저장 완료: ${studentId}`);
        } catch (error) {
            console.error('코멘트 저장 오류:', error);
            this.modals.showError('코멘트 저장에 실패했습니다.');
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

    handleSearch(query) {
        if (!query.trim()) {
            this.filteredStudents = [];
            this.renderStudentsList();
            return;
        }

        const searchTerm = query.toLowerCase();
        this.filteredStudents = this.students.filter(student => {
            return student.name.toLowerCase().includes(searchTerm) ||
                   student.email.toLowerCase().includes(searchTerm) ||
                   (student.institute_name && student.institute_name.toLowerCase().includes(searchTerm));
        });

        this.renderStudentsList();
        console.log(`🔍 검색 결과: ${this.filteredStudents.length}명`);
    }

    handleFilter(filterValue) {
        if (filterValue === 'all') {
            this.filteredStudents = [];
        } else {
            this.filteredStudents = this.students.filter(student => {
                const visa = this.visaData.get(student.id);
                const status = this.ui.determineStudentStatus(visa || {});
                return status === filterValue;
            });
        }

        this.renderStudentsList();
        console.log(`🔽 필터 적용 (${filterValue}): ${this.filteredStudents.length}명`);
    }

    handleSort(sortType) {
        const studentsToSort = this.filteredStudents.length > 0 ? this.filteredStudents : [...this.students];
        
        studentsToSort.sort((a, b) => {
            switch (sortType) {
                case 'name':
                    return a.name.localeCompare(b.name);
                    
                case 'updated':
                    const visaA = this.visaData.get(a.id);
                    const visaB = this.visaData.get(b.id);
                    const timeA = visaA?.visa_status_updated_at || visaA?.admin_comment_updated_at || visaA?.created_at || '1970-01-01';
                    const timeB = visaB?.visa_status_updated_at || visaB?.admin_comment_updated_at || visaB?.created_at || '1970-01-01';
                    return new Date(timeB) - new Date(timeA);
                    
                case 'status':
                    const getStatusPriority = (student) => {
                        const visa = this.visaData.get(student.id);
                        const status = this.ui.determineStudentStatus(visa || {});
                        
                        // 완료 -> 진행중 -> 상태없음 순으로 정렬
                        switch (status) {
                            case 'completed': return 1;
                            case 'in-progress': return 2;
                            case 'no-status': return 3;
                            default: return 4;
                        }
                    };
                    return getStatusPriority(a) - getStatusPriority(b);
                    
                default:
                    return 0;
            }
        });

        // 정렬된 결과를 현재 표시 목록에 반영
        if (this.filteredStudents.length > 0) {
            this.filteredStudents = studentsToSort;
        } else {
            this.students = studentsToSort;
        }

        this.renderStudentsList();
        console.log(`📊 정렬 적용: ${sortType}`);
    }

    /**
     * 데이터 새로고침
     */
    async refreshData() {
        console.log('🔄 데이터 새로고침 시작');
        await this.loadData();
    }

    /**
     * 특정 학생 데이터 새로고침
     */
    async refreshStudentData(studentId) {
        try {
            // 비자 정보 새로고침
            const visa = await this.api.getVisaApplication(studentId);
            if (visa) {
                this.visaData.set(studentId, visa);
            }
            
            // 영수증 개수 새로고침
            const receiptsCount = await this.api.getReceiptsCount([studentId]);
            this.receiptsCount.set(studentId, receiptsCount[studentId] || 0);
            
            // UI 업데이트
            this.updateStatistics();
            this.renderStudentsList();
            
            console.log(`🔄 학생 데이터 새로고침 완료: ${studentId}`);
        } catch (error) {
            console.error('학생 데이터 새로고침 오류:', error);
            this.modals.showError('데이터 새로고침에 실패했습니다.');
        }
    }

    /**
     * 실시간 데이터 동기화 설정
     */
    setupRealTimeSync() {
        // 비자 신청 변경 감지
        this.api.subscribeToVisaChanges((payload) => {
            console.log('🔄 비자 데이터 실시간 업데이트:', payload);
            
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                this.visaData.set(payload.new.user_id, payload.new);
                this.updateStatistics();
                this.renderStudentsList();
            }
        });
        
        // 영수증 변경 감지
        this.api.subscribeToReceiptChanges((payload) => {
            console.log('🔄 영수증 데이터 실시간 업데이트:', payload);
            this.refreshStudentData(payload.new?.user_id || payload.old?.user_id);
        });
    }

    /**
     * 시스템 상태 확인
     */
    async checkSystemStatus() {
        try {
            const isConnected = await this.api.checkConnection();
            if (!isConnected) {
                this.modals.showError('서버와의 연결이 끊어졌습니다. 페이지를 새로고침해주세요.');
                return false;
            }
            return true;
        } catch (error) {
            console.error('시스템 상태 확인 오류:', error);
            return false;
        }
    }

    /**
     * 정리 작업
     */
    cleanup() {
        // 타이머 정리
        this.commentSaveTimeouts.forEach(timeout => clearTimeout(timeout));
        this.commentSaveTimeouts.clear();
        
        // 모달 정리
        this.modals.closeAllModals();
        
        console.log('🧹 시스템 정리 완료');
    }

    /**
     * 디버그 정보 출력
     */
    getDebugInfo() {
        return {
            students: this.students.length,
            visaData: this.visaData.size,
            receiptsCount: this.receiptsCount.size,
            filteredStudents: this.filteredStudents.length,
            activeTimeouts: this.commentSaveTimeouts.size,
            currentUser: this.currentUser?.email || 'Unknown'
        };
    }
}

// 페이지 로드 시 시스템 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.visaManagementSystem = new VisaManagementSystem();
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (window.visaManagementSystem) {
        window.visaManagementSystem.cleanup();
    }
});

// 모듈 내보내기
export { VisaManagementSystem };