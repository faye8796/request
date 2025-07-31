/**
 * Supabase 클라이언트 설정
 * 실비 지원 시스템용 경량화 버전
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

    // HTTP 요청 훬퍼
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

    // UPSERT 실행
    async upsert(data, options = {}) {
        const headers = { ...this.client.headers };
        
        if (options.onConflict) {
            headers['Prefer'] = `resolution=merge-duplicates`;
        }
        
        const config = {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        };

        try {
            const response = await fetch(`${this.client.url}/rest/v1/${this.table}`, config);
            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || `HTTP ${response.status}`);
            }

            return { 
                data: Array.isArray(responseData) ? responseData : [responseData], 
                error: null 
            };
        } catch (error) {
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