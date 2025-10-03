package com.avatargamer.backend.users.controller;

import com.avatargamer.backend.users.dto.UserFilter;
import com.avatargamer.backend.users.dto.UserListItem;
import com.avatargamer.backend.users.service.UsersService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UsersController {

    private final UsersService service;

    public UsersController(UsersService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERADOR')")
    public Page<UserListItem> list(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,desc") String sort
    ) {
        UserFilter f = new UserFilter();
        f.setQuery(query);
        // parse sort "field,dir"
        String[] s = sort.split(",", 2);
        f.setSort(Sort.by(
                (s.length==2 && "asc".equalsIgnoreCase(s[1])) ? Sort.Direction.ASC : Sort.Direction.DESC,
                s[0]
        ));
        f.setPage(page);
        f.setSize(size);
        return service.findAll(f);
    }
}
