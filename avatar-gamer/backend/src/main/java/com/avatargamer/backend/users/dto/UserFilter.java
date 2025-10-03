package com.avatargamer.backend.users.dto;

import org.springframework.data.domain.Sort;

public class UserFilter {
    private String query;
    private Integer page = 0;
    private Integer size = 10;
    private Sort sort = Sort.by(Sort.Direction.DESC, "id"); // campo existente y seguro

    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }

    public Integer getPage() { return page; }
    public void setPage(Integer page) { this.page = page; }

    public Integer getSize() { return size; }
    public void setSize(Integer size) { this.size = size; }

    public Sort getSort() { return sort; }
    public void setSort(Sort sort) { this.sort = sort; }
}
