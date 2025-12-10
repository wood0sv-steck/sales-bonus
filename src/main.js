/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // purchase — одна запись из record.items
    const { discount, sale_price, quantity } = purchase;

    // Коэффициент с учётом скидки (в десятичном виде)
    const discountCoef = 1 - discount / 100;

    // Выручка = цена * количество * (1 - скидка)
    return sale_price * quantity * discountCoef;
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
    let rate = 0;

    // 1-е место
    if (index === 0) {
        rate = 0.15;
    // 2-е и 3-е место
    } else if (index === 1 || index === 2) {
        rate = 0.10;
    // Последнее место
    } else if (index === total - 1) {
        rate = 0;
    // Остальные
    } else {
        rate = 0.05;
    }

    return profit * rate;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // --- Проверка входных данных ---
    if (
        !data
        || !Array.isArray(data.sellers) || data.sellers.length === 0
        || !Array.isArray(data.products) || data.products.length === 0
        || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // --- Проверка наличия опций и функций ---
    if (!options || typeof options !== 'object') {
        throw new Error('Некорректные настройки');
    }

    const { calculateRevenue, calculateBonus } = options;

    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Некорректные функции расчёта');
    }

    // --- Подготовка промежуточных данных для сбора статистики ---
    const sellerStats = data.sellers.map((seller) => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}   // { [sku]: quantity }
    }));

    // --- Индексация продавцов и товаров для быстрого доступа ---
    const sellerIndex = {};
    sellerStats.forEach((seller) => {
        sellerIndex[seller.id] = seller;
    });

    const productIndex = {};
    data.products.forEach((product) => {
        productIndex[product.sku] = product;
    });

    // --- Расчёт выручки и прибыли для каждого продавца ---
    data.purchase_records.forEach((record) => {
        const seller = sellerIndex[record.seller_id];
        // Если в данных кривой seller_id, просто пропускаем
        if (!seller) {
            return;
        }

        // Количество продаж (чеков)
        seller.sales_count += 1;
        // Общая сумма всех продаж (по условию — total_amount из чека)
        seller.revenue += record.total_amount;

        // Перебор позиций в чеке
        record.items.forEach((item) => {
            const product = productIndex[item.sku];
            if (!product) {
                // Если нет товара в каталоге, пропускаем
                return;
            }

            // Себестоимость = закупочная цена * количество
            const cost = product.purchase_price * item.quantity;

            // Выручка по позиции с учётом скидки
            const revenue = calculateRevenue(item, product);

            // Прибыль = выручка - себестоимость
            const profit = revenue - cost;

            seller.profit += profit;

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // --- Сортировка продавцов по прибыли (по убыванию) ---
    sellerStats.sort((a, b) => b.profit - a.profit);

    // --- Назначение премий и формирование топ-10 товаров ---
    const totalSellers = sellerStats.length;

    sellerStats.forEach((seller, index) => {
        // Бонус по рейтингу
        seller.bonus = calculateBonus(index, totalSellers, seller);

        // Топ-10 товаров: [{ sku, quantity }]
        seller.top_products = Object
            .entries(seller.products_sold)                    // [[sku, quantity], ...]
            .map(([sku, quantity]) => ({ sku, quantity }))    // [{ sku, quantity }]
            .sort((a, b) => b.quantity - a.quantity)          // по убыванию количества
            .slice(0, 10);                                    // первые 10
    });

    // --- Подготовка итоговой коллекции с нужными полями ---
    return sellerStats.map((seller) => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}