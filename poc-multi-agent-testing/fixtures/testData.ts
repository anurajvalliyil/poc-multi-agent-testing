export const getTestData = (context: string): any => {
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

function generateFirstName(): string {
  const names = ['John', 'Jane', 'Alice', 'Bob', 'Charlie'];
  return names[Math.floor(Math.random() * names.length)];
}

function generateLastName(): string {
  const names = ['Doe', 'Smith', 'Johnson', 'Williams', 'Brown'];
  return names[Math.floor(Math.random() * names.length)];
}

function generatePostalCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}
