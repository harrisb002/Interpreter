export const LANGUAGE_VERSIONS = {
  blue: "1.0.0",
  javascript: "18.16.0",
  python: "3.10.0",
  java: "17.0.1",
  csharp: "6.12.0",
};

export const CODE_SNIPPETS = {
  blue: `
procedure main (void)
{
  int n;
  int sum;

  n = 100;
  sum = sum_of_first_n_squares(n);
  printf("sum of the squares of the first %d numbers = %d\\n", n, sum);
  return sum;
}

function int sum_of_first_n_squares(int n)
{
  int sum;

  sum = 0;
  if (n >= 1)
  {
    sum = n * (n + 1) * (2 * n + 1) / 6;
  }
  return sum;
}
`,
  javascript: `
function greet(name) {
  console.log("Hello, " + name + "!");
}

greet("Seawolf in JS!");
`,
  python: `
def greet(name):
  print("Hello, " + name + "!")

greet("Hello Seawolf in Python!")
`,
  java: `
public class HelloWorld {
  public static void main(String[] args) {
    System.out.println("Hello Seawolf in Java!");
  }
}
`,
  csharp: `
using System;

namespace HelloWorld
{
  class Hello {
    static void Main(string[] args) {
      Console.WriteLine("Hello Seawolf in C#!");
    }
  }
}
`,
};
