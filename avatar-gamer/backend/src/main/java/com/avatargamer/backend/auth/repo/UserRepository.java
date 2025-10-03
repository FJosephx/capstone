package com.avatargamer.backend.auth.repo;

import com.avatargamer.backend.auth.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    @Query("""
    SELECT u FROM User u
    WHERE (:q IS NULL
       OR LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%'))
       OR LOWER(u.email)    LIKE LOWER(CONCAT('%', :q, '%'))
    )
  """)
    Page<User> search(@Param("q") String query, Pageable pageable);
}
