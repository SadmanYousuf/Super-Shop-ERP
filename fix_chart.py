import sys
with open('e:/ERP SUPER SHOP/index.js', 'r', encoding='utf-8') as f:
    content = f.read()

marker = '// Load Supplier payables'
new_code = """
    // Render Sales Chart
    renderSalesChart(fin.sales_timeline);
}

function renderSalesChart(timeline) {
    const container = document.getElementById("sales-chart");
    if (!container) return;
    if (!timeline || timeline.length === 0) {
        container.innerHTML = "<div class='chart-empty'>No sales data yet. Complete a POS sale to see the chart!</div>";
        return;
    }
    const maxVal = Math.max(...timeline.map(d => parseFloat(d.total_sales)), 1);
    container.innerHTML = '';
    timeline.forEach(day => {
        const val = parseFloat(day.total_sales);
        const heightPct = (val / maxVal) * 100;
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-bar-wrapper';
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = Math.max(heightPct, 4) + '%';
        const valueLabel = document.createElement('span');
        valueLabel.className = 'chart-bar-value';
        valueLabel.innerText = '\u09f3' + val.toFixed(0);
        bar.appendChild(valueLabel);
        const label = document.createElement('span');
        label.className = 'chart-bar-label';
        const dateParts = day.date_val ? day.date_val.split('-') : [];
        if (dateParts.length === 3) {
            const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const month = monthNames[parseInt(dateParts[1]) - 1] || '';
            label.innerText = month + ' ' + parseInt(dateParts[2]);
        } else {
            label.innerText = day.date_val || '';
        }
        wrapper.appendChild(bar);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });
}"""

if marker in content:
    content = content.replace(marker, new_code + "\n\n" + marker)
    with open('e:/ERP SUPER SHOP/index.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('NOT FOUND')
