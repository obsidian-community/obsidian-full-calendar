import { formatOrdinalNumber } from "../event-recurrence-types";

describe("formatOrdinalNumber", () => {
    describe("when value ends in 1", () => {
        describe("when the tens place is zero", () => {
            describe("when the value is 1", () => {
                it("should end in st", () => {
                    const result = formatOrdinalNumber(1);
					
					expect(result).toBe("1st");
                });
            });

            describe("when the value is 101", () => {
                it("should end in st", () => {
                    const result = formatOrdinalNumber(101);
					
					expect(result).toBe("101st");
                });
            });
        });

        describe("when the tens place is one", () => {
            describe("when the value is 11", () => {
                it("should end in th", () => {
                    const result = formatOrdinalNumber(11);
					
					expect(result).toBe("11th");
                });
            });

            describe("when the value is 111", () => {
                it("should end in th", () => {
                    const result = formatOrdinalNumber(111);
					
					expect(result).toBe("111th");
                });
            });
        });

        describe("when the tens place is two", () => {
            describe("when the value is 21", () => {
                it("should end in st", () => {
                    const result = formatOrdinalNumber(21);
					
					expect(result).toBe("21st");
                });
            });

            describe("when the value is 121", () => {
                it("should end in st", () => {
                    const result = formatOrdinalNumber(121);
					
					expect(result).toBe("121st");
                });
            });
        });
    });

    describe("when value ends in 2", () => {
        describe("when the tens place is zero", () => {
            describe("when the value is 2", () => {
                it("should end in nd", () => {
                    const result = formatOrdinalNumber(2);
					
					expect(result).toBe("2nd");
                });
            });

            describe("when the value is 102", () => {
                it("should end in nd", () => {
                    const result = formatOrdinalNumber(102);
					
					expect(result).toBe("102nd");
                });
            });
        });

        describe("when the tens place is one", () => {
            describe("when the value is 12", () => {
                it("should end in th", () => {
                    const result = formatOrdinalNumber(12);
					
					expect(result).toBe("12th");
                });
            });

            describe("when the value is 112", () => {
                it("should end in th", () => {
                    const result = formatOrdinalNumber(112);
					
					expect(result).toBe("112th");
                });
            });
        });

        describe("when the tens place is two", () => {
            describe("when the value is 22", () => {
                it("should end in nd", () => {
                    const result = formatOrdinalNumber(22);
					
					expect(result).toBe("22nd");
                });
            });

            describe("when the value is 122", () => {
                it("should end in nd", () => {
                    const result = formatOrdinalNumber(122);
					
					expect(result).toBe("122nd");
                });
            });
        });
    });

    describe("when value ends in 3", () => {
        describe("when the tens place is zero", () => {
            describe("when the value is 3", () => {
                it("should end in rd", () => {
                    const result = formatOrdinalNumber(3);
					
					expect(result).toBe("3rd");
                });
            });

            describe("when the value is 103", () => {
                it("should end in rd", () => {
                    const result = formatOrdinalNumber(103);
					
					expect(result).toBe("103rd");
                });
            });
        });

        describe("when the tens place is one", () => {
            describe("when the value is 13", () => {
                it("should end in th", () => {
                    const result = formatOrdinalNumber(13);
					
					expect(result).toBe("13th");
                });
            });

            describe("when the value is 113", () => {
                it("should end in th", () => {
                    const result = formatOrdinalNumber(113);
					
					expect(result).toBe("113th");
                });
            });
        });

        describe("when the tens place is two", () => {
            describe("when the value is 23", () => {
                it("should end in rd", () => {
                    const result = formatOrdinalNumber(23);
					
					expect(result).toBe("23rd");
                });
            });

            describe("when the value is 123", () => {
                it("should end in rd", () => {
                    const result = formatOrdinalNumber(123);
					
					expect(result).toBe("123rd");
                });
            });
        });
    });

    describe("when the value does not end in 1, 2 or 3", () => {
        describe("when the value is 7", () => {
            it("should end in th", () => {
                const result = formatOrdinalNumber(7);
				
				expect(result).toBe("7th");
            });
        });

        describe("when the value is 17", () => {
            it("should end in th", () => {
                const result = formatOrdinalNumber(17);
				
				expect(result).toBe("17th");
            });
        });

        describe("when the value is 27", () => {
            it("should end in th", () => {
                const result = formatOrdinalNumber(27);
				
				expect(result).toBe("27th");
            });
        });

        describe("when the value is 107", () => {
            it("should end in th", () => {
                const result = formatOrdinalNumber(107);
				
				expect(result).toBe("107th");
            });
        });

        describe("when the value is 117", () => {
            it("should end in th", () => {
                const result = formatOrdinalNumber(117);
				
				expect(result).toBe("117th");
            });
        });

        describe("when the value is 127", () => {
            it("should end in th", () => {
                const result = formatOrdinalNumber(127);
				
				expect(result).toBe("127th");
            });
        });
    });
});
