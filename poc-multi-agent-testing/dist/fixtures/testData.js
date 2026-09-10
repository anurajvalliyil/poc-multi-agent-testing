export const getTestData = (context) => {
    if (context === 'login') {
        return {
            username: 'standard_user',
            password: 'secret_sauce'
        };
    }
    if (context === 'checkout') {
        return {
            firstName: generateFirstName(),
            lastName: generateLastName(),
            postalCode: generatePostalCode()
        };
    }
    return {};
};
function generateFirstName() {
    const names = ['John', 'Jane', 'Alice', 'Bob', 'Charlie'];
    return names[Math.floor(Math.random() * names.length)];
}
function generateLastName() {
    const names = ['Doe', 'Smith', 'Johnson', 'Williams', 'Brown'];
    return names[Math.floor(Math.random() * names.length)];
}
function generatePostalCode() {
    return Math.floor(10000 + Math.random() * 90000).toString();
}
