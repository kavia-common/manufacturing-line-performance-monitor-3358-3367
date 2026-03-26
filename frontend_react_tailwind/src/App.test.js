import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders login page when not authenticated", () => {
  render(<App />);
  const title = screen.getByText(/Ocean OEE/i);
  expect(title).toBeInTheDocument();
});
