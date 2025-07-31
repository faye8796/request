/**
 * Supabase 클라이언트 설정
 * 실비 지원 시스템용 경량화 버전 v1.1.0
 * 
 * 🔧 v1.1.0 업데이트:
 * - upsert 메서드 체이닝 지원 (.select().single() 호환)
 * - RLS 미적용 환경 최적화
 * - 에러 처리 개선
 */

// Supabase 설정
const SUPABASE_URL = 'https://aazvopacnbbkvusihqva.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhenZvcGFjbmJia3Z1c2locXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5MDAyOTIsImV4cCI6MjA0NzQ3NjI5Mn0.tsF6xjvCsq6G7Xrr3eRnDVPJpf-G6TwIE3jBdAFOJRU';

// 기본 클라이언트 클래스
class SupabaseClient {
    constructor() {
        this.url = SUPABASE_URL;
        this.key = SUPABASE_ANON_KEY;
        this.headers = {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    // 테이블 쿼리 빌더
    from(table) {
        return new QueryBuilder(table, this);
    }

    // HTTP 요청 래퍼
    async request(method, endpoint, body = null) {
        const config = {
            method,
            headers: this.headers
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${this.url}/rest/v1${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return { data, error: null, status: response.status };
        } catch (error) {
            return { data: null, error, status: 0 };
        }
    }
}

// 쿼리 빌더 클래스
class QueryBuilder {
    constructor(table, client) {
        this.table = table;
        this.client = client;
        this.query = {
            select: '*',
            filters: [],
            order: null,
            limit: null,
            single: false
        };
        
        // 🆕 v1.1.0: upsert 후 체이닝을 위한 플래그
        this.isUpsertOperation = false;
        this.upsertData = null;
        this.upsertOptions = {};
    }

    select(columns = '*') {
        this.query.select = columns;
        return this;
    }

    eq(column, value) {
        this.query.filters.push(`${column}=eq.${encodeURIComponent(value)}`);
        return this;
    }

    not(column, operator, value) {
        if (operator === 'is' && value === null) {
            this.query.filters.push(`${column}=not.is.null`);
        } else {
            this.query.filters.push(`${column}=not.${operator}.${encodeURIComponent(value)}`);
        }
        return this;
    }

    order(column, options = {}) {
        const direction = options.ascending === false ? 'desc' : 'asc';
        this.query.order = `${column}.${direction}`;
        return this;
    }

    limit(count) {
        this.query.limit = count;
        return this;
    }

    single() {
        this.query.single = true;
        return this;
    }

    // SELECT 실행
    async execute() {
        // 🆕 v1.1.0: upsert 후 체이닝인 경우
        if (this.isUpsertOperation) {
            return await this.executeUpsertWithSelect();
        }

        let endpoint = `/${this.table}?select=${this.query.select}`;
        
        if (this.query.filters.length > 0) {
            endpoint += '&' + this.query.filters.join('&');
        }
        
        if (this.query.order) {
            endpoint += `&order=${this.query.order}`;
        }
        
        if (this.query.limit) {
            endpoint += `&limit=${this.query.limit}`;
        }

        const result = await this.client.request('GET', endpoint);
        
        if (this.query.single) {
            return {
                data: result.data && result.data.length > 0 ? result.data[0] : null,
                error: result.error
            };
        }
        
        return result;
    }

    // 🆕 v1.1.0: upsert 후 select 실행
    async executeUpsertWithSelect() {
        try {
            // 1. upsert 실행
            const upsertResult = await this.performUpsert();
            if (upsertResult.error) {
                return upsertResult;
            }

            // 2. upsert 성공 후 데이터 조회
            if (upsertResult.data && upsertResult.data.length > 0) {
                // upsert에서 반환된 데이터가 있으면 사용
                const resultData = this.query.single ? upsertResult.data[0] : upsertResult.data;
                return { data: resultData, error: null };
            }

            // 3. 데이터가 없으면 별도 SELECT 실행
            // onConflict 필드를 기준으로 조회
            if (this.upsertOptions.onConflict && this.upsertData) {
                const conflictFields = this.upsertOptions.onConflict.split(',');
                
                // 새로운 QueryBuilder로 조회
                let selectQuery = new QueryBuilder(this.table, this.client);
                selectQuery.query.select = this.query.select;
                
                // conflict 필드들로 필터 생성
                conflictFields.forEach(field => {
                    const fieldValue = this.upsertData[field.trim()];
                    if (fieldValue !== undefined) {
                        selectQuery = selectQuery.eq(field.trim(), fieldValue);
                    }
                });
                
                if (this.query.single) {
                    selectQuery = selectQuery.single();
                }
                
                return await selectQuery.execute();
            }

            // 4. 기본 반환
            return { data: this.query.single ? null : [], error: null };

        } catch (error) {
            console.error('❌ upsert with select 실행 실패:', error);
            return { data: null, error };
        }
    }

    // INSERT 실행
    async insert(data) {
        const endpoint = `/${this.table}`;
        return await this.client.request('POST', endpoint, data);
    }

    // UPDATE 실행  
    async update(data) {
        let endpoint = `/${this.table}`;
        
        if (this.query.filters.length > 0) {
            endpoint += '?' + this.query.filters.join('&');
        }
        
        return await this.client.request('PATCH', endpoint, data);
    }

    // 🔧 v1.1.0: UPSERT 실행 - 체이닝 지원
    upsert(data, options = {}) {
        this.isUpsertOperation = true;
        this.upsertData = data;
        this.upsertOptions = options;
        return this; // 체이닝을 위해 this 반환
    }

    // 🆕 v1.1.0: 실제 upsert 실행
    async performUpsert() {
        const headers = { ...this.client.headers };
        
        // onConflict 옵션 처리
        if (this.upsertOptions.onConflict) {
            headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
        } else {
            headers['Prefer'] = 'return=representation';
        }
        
        // ignoreDuplicates 옵션 처리
        if (this.upsertOptions.ignoreDuplicates === false) {
            headers['Prefer'] = headers['Prefer'].replace('resolution=merge-duplicates', 'resolution=merge-duplicates');
        }
        
        const config = {
            method: 'POST',
            headers,
            body: JSON.stringify(this.upsertData)
        };

        try {
            const response = await fetch(`${this.client.url}/rest/v1/${this.table}`, config);
            let responseData = null;
            
            // 응답이 있는 경우에만 JSON 파싱
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            }

            if (!response.ok) {
                const errorMessage = responseData?.message || `HTTP ${response.status}`;
                throw new Error(errorMessage);
            }

            // 🔧 RLS 미적용 환경에서는 대부분 빈 응답이 올 수 있음
            const finalData = responseData ? 
                (Array.isArray(responseData) ? responseData : [responseData]) : 
                [this.upsertData]; // 빈 응답시 원본 데이터 반환

            return { 
                data: finalData, 
                error: null 
            };

        } catch (error) {
            console.error('❌ upsert 실행 실패:', error);
            return { data: null, error };
        }
    }

    // DELETE 실행
    async delete() {
        let endpoint = `/${this.table}`;
        
        if (this.query.filters.length > 0) {
            endpoint += '?' + this.query.filters.join('&');
        }
        
        return await this.client.request('DELETE', endpoint);
    }
}

// 전역 인스턴스 생성
const supabase = new SupabaseClient();

// 내보내기
export { supabase, SupabaseClient };

console.log('✅ supabase-client.js v1.1.0 로드 완료 - upsert 체이닝 지원 및 RLS 미적용 최적화');
