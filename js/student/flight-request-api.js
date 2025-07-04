            // 통화별 가격 범위 검증
            const priceRangeValidation = this.validatePriceByCurrency(
                requestData.ticket_price, 
                requestData.currency
            );