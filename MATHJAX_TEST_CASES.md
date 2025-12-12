# MathJax Test Cases

## Các trường hợp đã được xử lý trong renderMathContent:

### 1. Phân số (Fractions)
```
$$\frac{2}{3}$$ 
$$\frac{10}{35}$$
$\frac{a}{b}$
```

### 2. Bình phương / Lũy thừa (Powers)
```
$x^2$
$a^{10}$
$2^{n+1}$
$(x+y)^2$
```

### 3. Căn bậc hai (Square root)
```
$\sqrt{2}$
$\sqrt{x^2 + y^2}$
$\sqrt[3]{8}$ (căn bậc 3)
```

### 4. Chỉ số dưới (Subscripts)
```
$x_1$
$a_{n+1}$
```

### 5. Tổng / Tích phân (Sum / Integral)
```
$\sum_{i=1}^{n} x_i$
$\int_{0}^{1} f(x) dx$
$\prod_{i=1}^{n} a_i$
```

### 6. Giới hạn (Limits)
```
$\lim_{x \to 0} f(x)$
$\lim_{n \to \infty} a_n$
```

### 7. Ký hiệu Hy Lạp (Greek letters)
```
$\alpha, \beta, \gamma$
$\pi, \theta, \omega$
$\Delta, \Sigma, \Omega$
```

### 8. So sánh (Comparison)
```
$x > 5$
$x \leq 10$
$a \geq b$
$x \neq y$
```

### 9. Tập hợp (Sets)
```
$\{1, 2, 3\}$
$x \in A$
$A \cup B$
$A \cap B$
$\emptyset$
```

### 10. Ma trận (Matrix)
```
$\begin{pmatrix} a & b \\ c & d \end{pmatrix}$
```

### 11. Text trong Math
```
$x \text{ là số nguyên}$
$\text{Diện tích} = \frac{1}{2}bh$
```

### 12. Inline với text thường
```
Trong các phân số dưới đây, phân số nào bé hơn $\frac{2}{3}$
Giá trị của $x^2 + 2x + 1$ khi $x = 5$ là bao nhiêu?
```

## Cấu hình MathJax hiện tại:

```javascript
const mathJaxConfig = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],      // Inline: $...$ hoặc \(...\)
    displayMath: [['$$', '$$'], ['\\[', '\\]']],   // Display: $$...$$ hoặc \[...\]
    processEscapes: true,                           // Xử lý \$ để hiển thị $ thật
    processEnvironments: true,                      // Xử lý các environment như matrix
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
  },
};
```

## renderMathContent Function:

✅ Xử lý inline math với `<MathJax inline dynamic>`
✅ Giữ nguyên xuống dòng (`\n`)
✅ Xử lý cả text có và không có LaTeX
✅ Không bị cắt text khi có công thức dài

## Layout Improvements:

✅ Radio button align đúng với content
✅ Tag không bị lệch
✅ Word wrap và overflow được xử lý
✅ Flex layout tối ưu cho mobile và desktop

