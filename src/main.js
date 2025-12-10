/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const { discount, sale_price, quantity } = purchase;
    const discountFactor = 1 - (discount / 100);
    return sale_price * quantity * discountFactor;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
     const { profit } = seller;
    if (index === 0) {
        return profit * 0.15;
    } else if (index <= 2) {
        return profit * 0.10;
    } else if (index === total - 1) {
        return 0;
    } else {
        return profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
 const { calculateRevenue, calculateBonus } = options;
    
    // Проверка входных данных
    if (!data || 
        !Array.isArray(data.sellers) || !data.sellers.length ||
        !Array.isArray(data.products) || !data.products.length ||
        !Array.isArray(data.purchase_records) || !data.purchase_records.length ||
        !calculateRevenue || !calculateBonus) {
        throw new Error('Некорректные входные данные');
    }

    // Подготовка индексов
    const sellerIndex = Object.fromEntries(data.sellers.map(seller => [
        seller.id, {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {},
        }
    ]));

    const productIndex = Object.fromEntries(data.products.map(product => [
        product.sku, product
    ]));

    // Обработка чеков
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count++;
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            // Расчет выручки и прибыли
            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;
            
            seller.revenue += revenue;
            seller.profit += profit;

            // Учет проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Преобразование в массив и сортировка
    const sellerStats = Object.values(sellerIndex);
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Формирование итогового отчета
    return sellerStats.map(seller => {
        // Формирование топа проданных товаров
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        // Расчет бонуса
        const bonus = calculateBonus(
            sellerStats.indexOf(seller),
            sellerStats.length,
            seller
        );

        return {
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: +seller.revenue.toFixed(2),
            profit: +seller.profit.toFixed(2),
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: +bonus.toFixed(2)
        };
    });
}
