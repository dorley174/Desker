package utils

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

// ValidateStruct validates request DTOs.
func ValidateStruct(v any) error {
	if err := validate.Struct(v); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}
	return nil
}
