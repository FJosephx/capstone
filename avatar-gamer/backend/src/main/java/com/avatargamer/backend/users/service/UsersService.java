package com.avatargamer.backend.users.service;

import com.avatargamer.backend.users.dto.UserFilter;
import com.avatargamer.backend.users.dto.UserListItem;
import com.avatargamer.backend.auth.entity.User;
import com.avatargamer.backend.auth.repo.UserRepository;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.util.function.Function;

@Service
public class UsersService {

    private final UserRepository userRepository;

    public UsersService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Page<UserListItem> findAll(UserFilter f) {
        Pageable pageable = PageRequest.of(
                f.getPage() == null ? 0 : f.getPage(),
                f.getSize() == null ? 10 : f.getSize(),
                f.getSort() == null ? Sort.by(Sort.Direction.DESC, "id") : f.getSort()
        );

        Page<User> page = userRepository.search(safe(f.getQuery()), pageable);
        return page.map(mapToItem());
    }

    private Function<User, UserListItem> mapToItem() {
        return u -> {
            UserListItem dto = new UserListItem();
            dto.setId(u.getId());
            dto.setUsername(u.getUsername());
            dto.setEmail(u.getEmail());
            return dto;
        };
    }

    private String safe(String s){
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
