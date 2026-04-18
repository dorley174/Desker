package utils

// PaginationParams defines request-level pagination fields.
type PaginationParams struct {
	Page     int
	PageSize int
}

// Normalize clamps invalid pagination values.
func (p PaginationParams) Normalize() PaginationParams {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PageSize < 1 {
		p.PageSize = 20
	}
	if p.PageSize > 100 {
		p.PageSize = 100
	}
	return p
}
