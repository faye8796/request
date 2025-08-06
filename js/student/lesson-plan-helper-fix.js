// 🛠️ 수업계획 반려 사유 표시 기능 수정 방법
// js/student/lesson-plan-helper.js 파일의 379-405번째 줄 부근을 아래와 같이 수정하세요

// 기존 코드 (379번째 줄 부근):
} else if (lessonPlan.status === 'approved') {
    // ... 승인된 경우의 코드 ...
    noticeType = 'success';
}

// 🆕 추가할 코드 - 반려된 경우 처리:
} else if (lessonPlan.status === 'rejected') {
    // 반려 사유 표시
    const rejectionReason = lessonPlan.rejection_reason || '구체적인 사유가 제공되지 않았습니다.';
    
    noticeContent = `
        <div class="notice-content danger">
            <i data-lucide="calendar-x"></i>
            <div>
                <h4>❌ 수업계획이 반려되었습니다</h4>
                <p><strong>반려 사유:</strong> ${rejectionReason}</p>
                <p>반려 사유를 확인하고 수업계획을 수정해주세요.</p>
                <button class="btn danger small" onclick="LessonPlanHelper.handleLessonPlanClick()">
                    ✏️ 수업계획 수정하기
                </button>
            </div>
        </div>
    `;
    noticeType = 'danger';
} else if (lessonPlan.status === 'approved') {
    // ... 기존 승인된 경우의 코드 ...
    noticeType = 'success';
}

// 📝 정확한 위치:
// showLessonPlanStatusNotice 함수 내부의 if (!lessonPlan) 블록 다음,
// else if (lessonPlan.status === 'approved') 블록 앞에 위 코드를 삽입하세요.
